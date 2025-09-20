import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { TiersService } from '../tiers/tiers.service'
import { ObligationsService } from '../obligations/obligations.service'
import { RouletteService } from '../roulette/roulette.service'

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly tiersService: TiersService,
    private readonly obligationsService: ObligationsService,
    private readonly rouletteService: RouletteService
  ) {}

  // 毎日0時に実行
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyMidnightTasks() {
    this.logger.log('===== 開始: 毎日0時のタスク =====')

    try {
      // 1. 期限切れ義務を処理
      const expired = await this.obligationsService.expireOldPending()
      this.logger.log(`期限切れ義務を処理: ${expired}件`)

      // 2. 新しい義務を発行
      const obligations = await this.obligationsService.generateForAllUsers()
      this.logger.log(`新規義務を発行: ${obligations.created}件`)

      // 3. ルーレット実行
      const roulette = await this.rouletteService.runDailyRouletteForAll()
      this.logger.log(`ルーレット実行: ${roulette.processed}人`)

      // 4. 階層分布を記録
      await this.recordTierDistribution()

      this.logger.log('===== 完了: 毎日0時のタスク =====')
    } catch (error) {
      this.logger.error('毎日0時のタスクでエラー:', error)
    }
  }

  // 毎週月曜0時に実行（週次イベント）
  @Cron('0 0 * * 1')
  async weeklyMondayTasks() {
    this.logger.log('===== 開始: 週次タスク（月曜0時） =====')

    try {
      // 下克上イベントをチェック
      await this.checkGekokujoEvent()

      this.logger.log('===== 完了: 週次タスク =====')
    } catch (error) {
      this.logger.error('週次タスクでエラー:', error)
    }
  }

  // 毎月1日0時に実行（月次イベント）
  @Cron('0 0 1 * *')
  async monthlyFirstDayTasks() {
    this.logger.log('===== 開始: 月次タスク（1日0時） =====')

    try {
      // 大革命イベントをチェック
      await this.checkRevolutionEvent()

      // 月次統計を生成
      await this.generateMonthlyReport()

      this.logger.log('===== 完了: 月次タスク =====')
    } catch (error) {
      this.logger.error('月次タスクでエラー:', error)
    }
  }

  // 毎時実行（義務チェックなど）
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyTasks() {
    try {
      // 長期滞在者をチェック（8階60日以上）
      await this.checkLongStayers()
    } catch (error) {
      this.logger.error('毎時タスクでエラー:', error)
    }
  }

  // 階層分布を記録
  private async recordTierDistribution() {
    const distribution = await this.tiersService.getTierDistribution()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await this.prisma.tierDistributionDaily.upsert({
      where: { day: today },
      update: { counts: distribution },
      create: {
        day: today,
        counts: distribution
      }
    })

    this.logger.log('階層分布を記録:', distribution)
  }

  // 下克上イベントをチェック
  private async checkGekokujoEvent() {
    // ランダムで発動（10%の確率）
    if (Math.random() > 0.1) {
      this.logger.log('下克上イベントは発動しませんでした')
      return
    }

    await this.prisma.event.create({
      data: {
        kind: 'gekokujo',
        windowFrom: new Date(),
        windowTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
        payload: { message: '下克上の日！下位階層からの上昇確率UP' },
        triggeredBy: 'scheduler'
      }
    })

    this.logger.log('下克上イベントを発動！')
  }

  // 大革命イベントをチェック
  private async checkRevolutionEvent() {
    // ランダムで発動（5%の確率）
    if (Math.random() > 0.05) {
      this.logger.log('大革命イベントは発動しませんでした')
      return
    }

    await this.prisma.event.create({
      data: {
        kind: 'revolution',
        windowFrom: new Date(),
        windowTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
        payload: { message: '大革命の日！全階層が均等確率に' },
        triggeredBy: 'scheduler'
      }
    })

    this.logger.log('大革命イベントを発動！')
  }

  // 長期滞在者をチェック（8階60日以上）
  private async checkLongStayers() {
    const longStayers = await this.prisma.userTierState.findMany({
      where: {
        tierId: 8,
        stayDays: { gte: 60 }
      },
      include: { user: true }
    })

    for (const stayer of longStayers) {
      // 1-3階にランダムに強制移動
      const newTierId = Math.floor(Math.random() * 3) + 1

      await this.tiersService.forceChangeTier(
        stayer.userId,
        newTierId,
        '60日以上滞在による強制降格'
      )

      this.logger.log(`ユーザー ${stayer.userId} を8階から${newTierId}階へ強制移動`)
    }
  }

  // 月次レポート生成
  private async generateMonthlyReport() {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const [
      totalUsers,
      activeUsers,
      totalTransitions,
      completedObligations
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.loginLog.count({
        where: {
          createdAt: { gte: lastMonth }
        }
      }),
      this.prisma.tierTransition.count({
        where: {
          decidedAt: { gte: lastMonth }
        }
      }),
      this.prisma.obligation.count({
        where: {
          status: 'completed',
          issuedFor: { gte: lastMonth }
        }
      })
    ])

    const report = {
      month: lastMonth.toISOString().slice(0, 7),
      totalUsers,
      activeUsers,
      totalTransitions,
      completedObligations,
      generatedAt: new Date()
    }

    this.logger.log('月次レポート:', report)

    // TODO: レポートをデータベースに保存または管理者に送信
    return report
  }
}