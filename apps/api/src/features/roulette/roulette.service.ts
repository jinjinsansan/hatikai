import { Injectable, Logger } from '@nestjs/common'
import { ObligationPeriod, Prisma, User, UserTierState } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { nowJst, jstDayStart, jstAddDays } from '../../utils/time'

type Dist = number[] // length 8

@Injectable()
export class RouletteService {
  private readonly logger = new Logger(RouletteService.name)

  constructor(private prisma: PrismaService) {}

  async runDailyRouletteForAll(): Promise<{ processed: number }> {
    const users = await this.prisma.user.findMany({ include: { tierState: true } })
    let processed = 0
    for (const u of users) {
      try {
        const changed = await this.runForUser(u)
        if (changed) processed++
      } catch (e) {
        this.logger.error(`Failed roulette for user ${u.id}: ${String(e)}`)
      }
    }
    this.logger.log(`Daily roulette processed=${processed}/${users.length}`)
    return { processed }
  }

  async runForUser(user: User): Promise<boolean> {
    const state = await this.ensureTierState(user)
    const now = nowJst()
    if (state.lockUntil && state.lockUntil > now) {
      const m = await this.modifiers(state, user.id)
      await this.logTransition(user.id, state.tierId, state.tierId, this.baseDist(), { up: m.up, down: m.down }, 'locked')
      return false
    }

    const base = this.baseDist()
    const mods = await this.modifiers(state, user.id)
    let dist = this.applyModifiers(base, { up: mods.up, down: mods.down })
    dist = await this.applyEvents(dist)
    const nextTierId = this.sampleTier(dist)

    await this.applyTransition(user, state, nextTierId, base, { up: mods.up, down: mods.down })
    return true
  }

  async preview(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('user_not_found')
    const state = await this.ensureTierState(user)
    const base = this.baseDist()
    const mods = await this.modifiers(state, userId)
    let dist = this.applyModifiers(base, { up: mods.up, down: mods.down })
    dist = await this.applyEvents(dist)
    return { base, mods, dist }
  }

  private async ensureTierState(user: User): Promise<UserTierState> {
    let ts = await this.prisma.userTierState.findUnique({ where: { userId: user.id } })
    if (!ts) {
      // 初期配置: ルーレットで決定
      const base = this.baseDist()
      const tierId = this.sampleTier(base)
      ts = await this.prisma.userTierState.create({ data: { userId: user.id, tierId } })
      await this.logTransition(user.id, null, tierId, base, { up: 0, down: 0 }, 'initial')
    }
    return ts
  }

  private baseDist(): Dist {
    return [0.30, 0.20, 0.15, 0.12, 0.10, 0.08, 0.03, 0.02]
  }

  private async modifiers(state: UserTierState, userId: string): Promise<{ up: number; down: number; detail: any }> {
    let up = 0
    let down = 0
    const detail: any = {}

    // 紹介人数: +2%/人（最大+10%）
    const referrals = await this.prisma.user.count({ where: { referredBy: userId } })
    const referralBoost = Math.min(referrals, 5) * 0.02
    if (referralBoost > 0) { up += referralBoost; detail.referrals = { referrals, boost: referralBoost } }

    // 広告超過視聴: 必要回数×2で+3%
    const today = jstDayStart(nowJst())
    const todayOb = await this.prisma.obligation.findUnique({ where: { userId_period_issuedFor: { userId, period: 'day', issuedFor: today } } })
    if (todayOb) {
      const needAds = Number((todayOb.schemaSnapshot as any)?.ads || 0)
      const gotAds = Number((todayOb.progress as any)?.ads || 0)
      if (needAds > 0 && gotAds >= needAds * 2) { up += 0.03; detail.extraAds = { needAds, gotAds, boost: 0.03 } }
    }

    // 連続ログイン: 7日+1%、30日+5%
    const streak = await this.loginStreak(userId)
    if (streak >= 30) { up += 0.05; detail.loginStreak = { streak, boost: 0.05 } }
    else if (streak >= 7) { up += 0.01; detail.loginStreak = { streak, boost: 0.01 } }

    // 義務未達成: 前日がexpiredで+15%
    const yesterday = jstAddDays(today, -1)
    const yOb = await this.prisma.obligation.findUnique({ where: { userId_period_issuedFor: { userId, period: 'day', issuedFor: yesterday } } })
    if (yOb && yOb.status === 'expired') { down += 0.15; detail.missedObligation = { day: yesterday, penalty: 0.15 } }

    // 長期滞在: 30日以上で+3%/週（最大+30%）
    if (state.stayDays >= 30) {
      const weeks = Math.floor((state.stayDays - 30) / 7) + 1
      const pen = Math.min(0.30, weeks * 0.03)
      down += pen
      detail.longStay = { stayDays: state.stayDays, penalty: pen }
    }

    return { up, down, detail }
  }

  private applyModifiers(base: Dist, m: { up: number; down: number }): Dist {
    // 上昇/下降のスコアを指数重みで反映
    const k = 2.0
    const net = Math.max(-0.5, Math.min(0.5, m.up - m.down))
    const weights = base.map((p, idx) => p * Math.exp(k * net * (idx + 1)))
    const sum = weights.reduce((a, b) => a + b, 0)
    return weights.map(w => w / sum)
  }

  private async applyEvents(dist: Dist): Promise<Dist> {
    const now = nowJst()
    const ev = await this.prisma.event.findFirst({
      where: {
        AND: [
          { OR: [{ windowFrom: null }, { windowFrom: { lte: now } }] },
          { OR: [{ windowTo: null }, { windowTo: { gte: now } }] }
        ]
      },
      orderBy: { triggeredAt: 'desc' }
    })
    if (!ev) return dist
    if (ev.kind === 'revolution') {
      return Array(8).fill(1 / 8)
    }
    if (ev.kind === 'gekokujo') {
      // 下克上: 下位（1-3）からの上昇をブースト → 上位側に重み
      const boosted = dist.map((p, idx) => p * (idx < 3 ? 0.8 : 1.2))
      const s = boosted.reduce((a, b) => a + b, 0)
      return boosted.map(x => x / s)
    }
    return dist
  }

  private sampleTier(dist: Dist): number {
    const r = Math.random()
    let acc = 0
    for (let i = 0; i < dist.length; i++) {
      acc += dist[i]
      if (r <= acc) return i + 1
    }
    return 8
  }

  private async applyTransition(
    user: User,
    state: UserTierState,
    nextTierId: number,
    base: Dist,
    mods: { up: number; down: number }
  ) {
    const from = state.tierId
    const to = nextTierId
    // ロック期間
    const now = nowJst()
    let lockUntil: Date | null = null
    if (to > from) {
      // 昇格: 1-3日
      const days = 1 + Math.floor(Math.random() * 3)
      lockUntil = new Date(now.getTime() + days * 24 * 3600 * 1000)
    } else if (to < from) {
      // 降格: 3-7日
      const days = 3 + Math.floor(Math.random() * 5)
      lockUntil = new Date(now.getTime() + days * 24 * 3600 * 1000)
    }

    await this.prisma.$transaction(async tx => {
      await tx.tierTransition.create({
        data: {
          userId: user.id,
          fromTierId: from,
          toTierId: to,
          baseProbs: base as unknown as Prisma.InputJsonValue,
          modifiers: mods as unknown as Prisma.InputJsonValue,
          reason: 'daily'
        }
      })
      await tx.userTierState.update({
        where: { userId: user.id },
        data: {
          tierId: to,
          effectiveFrom: now,
          lockUntil: lockUntil ?? undefined,
          stayDays: to === from ? { increment: 1 } : 0
        }
      })
    })
  }

  private async logTransition(
    userId: string,
    fromTierId: number | null,
    toTierId: number,
    base: Dist,
    mods: { up: number; down: number },
    reason: string
  ) {
    await this.prisma.tierTransition.create({
      data: {
        userId,
        fromTierId: fromTierId ?? undefined,
        toTierId,
        baseProbs: base as unknown as Prisma.InputJsonValue,
        modifiers: mods as unknown as Prisma.InputJsonValue,
        reason
      }
    })
  }

  private async loginStreak(userId: string): Promise<number> {
    const today = jstDayStart(nowJst())
    const logs = await this.prisma.loginLog.findMany({ where: { userId }, orderBy: { day: 'desc' }, take: 40 })
    let streak = 0
    let d = today.getTime()
    for (const log of logs) {
      const t = log.day.getTime()
      if (t === d) {
        streak++
        d = jstAddDays(new Date(d), -1).getTime()
      } else if (t === jstAddDays(new Date(d), -1).getTime()) {
        streak++
        d = jstAddDays(new Date(d), -2).getTime()
      } else {
        break
      }
    }
    return streak
  }
}
