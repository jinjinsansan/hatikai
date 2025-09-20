import { Injectable } from '@nestjs/common'
import { ObligationPeriod, ObligationStatus, Prisma, User } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { jstDayStart, jstMonthStart, jstWeekStart, nowJst } from '../../utils/time'

type Period = 'day' | 'week' | 'month'

@Injectable()
export class ObligationsService {
  constructor(public readonly prisma: PrismaService) {}

  async generateForAllUsers(): Promise<{ created: number }> {
    const users = await this.prisma.user.findMany({ include: { tierState: true } })
    let created = 0
    for (const u of users) {
      const c = await this.generateForUser(u)
      created += c
    }
    return { created }
  }

  async generateForUser(user: User): Promise<number> {
    const state = await this.prisma.userTierState.findUnique({ where: { userId: user.id } })
    if (!state) return 0
    const tier = await this.prisma.tier.findUnique({ where: { id: state.tierId } })
    if (!tier) return 0
    const schema = tier.obligationsSchema as any
    let created = 0
    for (const p of ['day', 'week', 'month'] as Period[]) {
      const def = schema?.[p]
      if (!def) continue
      const issuedFor = this.periodStart(p, nowJst())
      try {
        await this.prisma.obligation.create({
          data: {
            userId: user.id,
            period: p as ObligationPeriod,
            schemaSnapshot: def as Prisma.InputJsonValue,
            issuedFor
          }
        })
        created++
      } catch (e: any) {
        // unique violation → 既存あり
        if (!String(e?.message || '').includes('Unique constraint')) {
          throw e
        }
      }
    }
    return created
  }

  async expireOldPending(): Promise<number> {
    const today = jstDayStart(nowJst())
    const res = await this.prisma.obligation.updateMany({
      where: { status: 'pending', issuedFor: { lt: today } },
      data: { status: 'expired' }
    })
    return res.count
  }

  async listForUser(userId: string, period: Period) {
    const issuedFor = this.periodStart(period, nowJst())
    return this.prisma.obligation.findMany({
      where: { userId, period: period as ObligationPeriod, issuedFor },
      orderBy: { issuedFor: 'desc' }
    })
  }

  async addProgress(userId: string, obligationId: string, kind: string, meta?: any) {
    const ob = await this.prisma.obligation.findUnique({ where: { id: obligationId } })
    if (!ob || ob.userId !== userId) throw new Error('not_found')
    await this.prisma.$transaction(async tx => {
      await tx.obligationLog.create({ data: { obligationId, kind, meta } })
      const progress = (ob.progress as any) || {}
      // 簡易ルール: 広告視聴は ads カウントを+1
      if (kind === 'view_ad') {
        progress.ads = (progress.ads || 0) + 1
      } else {
        progress[kind] = (progress[kind] || 0) + 1
      }

      // 完了判定（schemaSnapshotの数値項目を満たすか）
      const schema = ob.schemaSnapshot as any
      let completed = true
      for (const k of Object.keys(schema)) {
        const required = Number(schema[k] || 0)
        if (required > 0) {
          const got = Number(progress[k] || 0)
          if (got < required) { completed = false; break }
        }
      }
      await tx.obligation.update({ where: { id: obligationId }, data: { progress: progress as any, status: completed ? ObligationStatus.completed : ob.status } })
    })
    return { ok: true }
  }

  private periodStart(period: Period, d: Date): Date {
    switch (period) {
      case 'day': return jstDayStart(d)
      case 'week': return jstWeekStart(d)
      case 'month': return jstMonthStart(d)
    }
  }
}

