import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { jstDayStart, nowJst } from '../../utils/time'

@Injectable()
export class DrawsService {
  constructor(private prisma: PrismaService) {}

  async status(userId: string) {
    const today = jstDayStart(nowJst())
    const entry = await this.prisma.drawEntry.findUnique({ where: { userId_day: { userId, day: today } } }).catch(()=>null)
    const wins = await this.prisma.drawWin.findMany({ where: { userId }, orderBy: { decidedAt: 'desc' }, take: 10, include: { reward: true } })
    // Eligible if today's day obligation is completed
    const ob = await this.prisma.obligation.findUnique({ where: { userId_period_issuedFor: { userId, period: 'day', issuedFor: today } } })
    const eligible = !!ob && ob.status === 'completed'
    return { eligible, enteredToday: !!entry, wins }
  }

  async enter(userId: string) {
    const today = jstDayStart(nowJst())
    // check eligibility
    const ob = await this.prisma.obligation.findUnique({ where: { userId_period_issuedFor: { userId, period: 'day', issuedFor: today } } })
    if (!ob || ob.status !== 'completed') throw new Error('not_eligible')
    // prevent duplicate
    const exists = await this.prisma.drawEntry.findUnique({ where: { userId_day: { userId, day: today } } }).catch(()=>null)
    if (exists) return { entered: true, won: false }
    // create entry and decide
    await this.prisma.drawEntry.create({ data: { userId, day: today } })
    const rewards = await this.prisma.reward.findMany()
    let won = false
    let rewardId: string | null = null
    if (rewards.length) {
      // simple 10% base win chance; pick reward by weight
      if (Math.random() < 0.10) {
        const weights = rewards.map(r => r.weight)
        const sum = weights.reduce((a, b) => a + b, 0)
        const r = Math.random() * sum
        let acc = 0
        for (const rw of rewards) { acc += rw.weight; if (r <= acc) { rewardId = rw.id; break } }
        won = true
      }
    }
    if (won) {
      const win = await this.prisma.drawWin.create({ data: { userId, rewardId: rewardId ?? undefined } })
      return { entered: true, won: true, win }
    }
    return { entered: true, won: false }
  }
}

