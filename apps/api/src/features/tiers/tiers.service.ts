import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TIER_CONFIGS, BASE_PROBABILITIES, PROBABILITY_MODIFIERS } from './tier-config'

@Injectable()
export class TiersService {
  constructor(private readonly prisma: PrismaService) {}

  // 階層情報を取得
  async getTiers() {
    const tiers = await this.prisma.tier.findMany({
      orderBy: { id: 'asc' }
    })

    // DBにない場合は設定から生成
    if (tiers.length === 0) {
      await this.initializeTiers()
      return await this.prisma.tier.findMany({
        orderBy: { id: 'asc' }
      })
    }

    return tiers
  }

  // 階層情報を初期化
  async initializeTiers() {
    for (const config of TIER_CONFIGS) {
      await this.prisma.tier.upsert({
        where: { id: config.id },
        update: {
          name: config.displayName,
          obligationsSchema: config.obligations as any,
          perksSchema: config.perks as any,
          rulesVersion: 1
        },
        create: {
          id: config.id,
          name: config.displayName,
          obligationsSchema: config.obligations as any,
          perksSchema: config.perks as any,
          rulesVersion: 1
        }
      })
    }
  }

  // ユーザーの現在の階層を取得
  async getUserTier(userId: string) {
    const tierState = await this.prisma.userTierState.findUnique({
      where: { userId },
      include: { tier: true }
    })

    if (!tierState) {
      // 初回は階層を割り当て
      return await this.assignInitialTier(userId)
    }

    return tierState
  }

  // 初回階層割り当て（ルーレット）
  async assignInitialTier(userId: string) {
    const tierId = this.calculateTierByProbability()

    const tierState = await this.prisma.userTierState.create({
      data: {
        userId,
        tierId,
        effectiveFrom: new Date(),
        stayDays: 0
      },
      include: { tier: true }
    })

    // 履歴を記録
    await this.prisma.tierTransition.create({
      data: {
        userId,
        fromTierId: null,
        toTierId: tierId,
        baseProbs: BASE_PROBABILITIES,
        modifiers: {},
        reason: 'initial_assignment'
      }
    })

    return tierState
  }

  // 確率に基づいて階層を計算
  calculateTierByProbability(modifiers: Record<string, number> = {}): number {
    const probs: Record<number, number> = { ...BASE_PROBABILITIES }

    // 修正要素を適用（今後実装）
    // TODO: modifiersに基づいて確率を調整

    // ルーレット実行
    const random = Math.random()
    let cumulative = 0

    for (let tierId = 1; tierId <= 8; tierId++) {
      cumulative += probs[tierId]
      if (random < cumulative) {
        return tierId
      }
    }

    return 1 // フォールバック
  }

  // 階層変更（毎日0時実行）
  async changeTier(userId: string) {
    const currentState = await this.getUserTier(userId)
    if (!currentState) return null

    // 修正要素を計算
    const modifiers = await this.calculateModifiers(userId)

    // 新しい階層を決定
    const newTierId = this.calculateTierByProbability(modifiers)

    // 同じ階層の場合はstayDaysを増やす
    if (currentState.tierId === newTierId) {
      await this.prisma.userTierState.update({
        where: { userId },
        data: { stayDays: currentState.stayDays + 1 }
      })
      return currentState
    }

    // 階層変更
    const newState = await this.prisma.userTierState.update({
      where: { userId },
      data: {
        tierId: newTierId,
        effectiveFrom: new Date(),
        stayDays: 0,
        lockUntil: this.calculateLockPeriod(currentState.tierId, newTierId)
      },
      include: { tier: true }
    })

    // 履歴を記録
    await this.prisma.tierTransition.create({
      data: {
        userId,
        fromTierId: currentState.tierId,
        toTierId: newTierId,
        baseProbs: BASE_PROBABILITIES,
        modifiers,
        reason: 'daily_roulette'
      }
    })

    return newState
  }

  // ロック期間を計算
  calculateLockPeriod(fromTierId: number, toTierId: number): Date | null {
    const now = new Date()

    // 降格時: 3-7日間変更不可
    if (fromTierId > toTierId) {
      const days = 3 + Math.floor(Math.random() * 5) // 3-7日
      const lockUntil = new Date(now)
      lockUntil.setDate(lockUntil.getDate() + days)
      return lockUntil
    }

    // 昇格時: 1-3日間変更不可
    if (fromTierId < toTierId) {
      const days = 1 + Math.floor(Math.random() * 3) // 1-3日
      const lockUntil = new Date(now)
      lockUntil.setDate(lockUntil.getDate() + days)
      return lockUntil
    }

    return null
  }

  // 修正要素を計算
  async calculateModifiers(userId: string): Promise<Record<string, number>> {
    const modifiers: Record<string, number> = {}

    // TODO: 実装
    // - 義務達成状況
    // - 連続ログイン日数
    // - 紹介人数
    // - 長期滞在ペナルティ
    // - etc

    return modifiers
  }

  // 階層分布を取得（管理画面用）
  async getTierDistribution() {
    const distribution = await this.prisma.userTierState.groupBy({
      by: ['tierId'],
      _count: {
        userId: true
      }
    })

    const result: Record<number, number> = {}
    for (let i = 1; i <= 8; i++) {
      const tier = distribution.find(d => d.tierId === i)
      result[i] = tier?._count.userId || 0
    }

    return result
  }

  // 強制階層変更（管理者用）
  async forceChangeTier(userId: string, tierId: number, reason: string) {
    const currentState = await this.getUserTier(userId)

    const newState = await this.prisma.userTierState.update({
      where: { userId },
      data: {
        tierId,
        effectiveFrom: new Date(),
        stayDays: 0,
        lockUntil: null
      },
      include: { tier: true }
    })

    // 履歴を記録
    await this.prisma.tierTransition.create({
      data: {
        userId,
        fromTierId: currentState?.tierId || null,
        toTierId: tierId,
        baseProbs: {},
        modifiers: {},
        reason: `admin_force: ${reason}`
      }
    })

    return newState
  }
}