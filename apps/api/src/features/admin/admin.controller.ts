import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

function requireAdmin(tokenHeader: string | undefined) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) throw new Error('admin_not_configured')
  if (!tokenHeader || tokenHeader !== expected) throw new Error('forbidden')
}

@Controller('/admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('/dashboard')
  async dashboard(@Headers('x-admin-token') token?: string) {
    requireAdmin(token)
    const [users, states, pending, completed, events] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userTierState.groupBy({ by: ['tierId'], _count: true }),
      this.prisma.obligation.count({ where: { status: 'pending' } }),
      this.prisma.obligation.count({ where: { status: 'completed' } }),
      this.prisma.event.findMany({ orderBy: { triggeredAt: 'desc' }, take: 5 })
    ])
    return {
      users,
      tierDistribution: states.map(s => ({ tierId: s.tierId, count: s._count })),
      obligations: { pending, completed },
      events
    }
  }

  @Get('/users')
  async users(
    @Headers('x-admin-token') token?: string,
    @Query('q') q?: string,
    @Query('tierId') tierIdQ?: string,
    @Query('limit') limitQ?: string
  ) {
    requireAdmin(token)
    const take = Math.min(Math.max(Number(limitQ || 50), 1), 200)
    const tierId = tierIdQ ? Number(tierIdQ) : undefined
    if (tierId) {
      const rows = await this.prisma.userTierState.findMany({ where: { tierId }, include: { user: true }, take })
      return rows.map(r => ({ id: r.user.id, email: r.user.email, handle: r.user.handle, tierId: r.tierId }))
    }
    const where: any = q
      ? { OR: [ { email: { contains: q, mode: 'insensitive' } }, { handle: { contains: q, mode: 'insensitive' } } ] }
      : {}
    const users = await this.prisma.user.findMany({ where, include: { tierState: true }, take, orderBy: { createdAt: 'desc' } })
    return users.map(u => ({ id: u.id, email: u.email, handle: u.handle, tierId: (u as any).tierState?.tierId || null }))
  }

  @Post('/force-tier')
  async forceTier(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: { userId: string; tierId: number; lockDays?: number }
  ) {
    requireAdmin(token)
    const { userId, tierId, lockDays } = body || ({} as any)
    if (!userId || !tierId) throw new Error('missing_params')
    const now = new Date()
    const lockUntil = lockDays && lockDays > 0 ? new Date(now.getTime() + lockDays * 24 * 3600 * 1000) : null
    return await this.prisma.$transaction(async tx => {
      // ensure user and state
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('user_not_found')
      const state = await tx.userTierState.upsert({
        where: { userId },
        update: { tierId, effectiveFrom: now, lockUntil, stayDays: 0 },
        create: { userId, tierId, effectiveFrom: now, lockUntil }
      })
      await tx.tierTransition.create({
        data: {
          userId,
          fromTierId: state.tierId,
          toTierId: tierId,
          baseProbs: [0,0,0,0,0,0,0,0] as unknown as Prisma.InputJsonValue,
          modifiers: { admin: true } as unknown as Prisma.InputJsonValue,
          reason: 'admin_force'
        }
      })
      return { ok: true }
    })
  }

  @Post('/force-tier/bulk')
  async forceTierBulk(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: { items: { userId: string; tierId: number; lockDays?: number }[] }
  ) {
    requireAdmin(token)
    const items = body?.items || []
    const results: any[] = []
    for (const it of items) {
      try {
        await this.forceTier(token, it)
        results.push({ userId: it.userId, ok: true })
      } catch (e: any) {
        results.push({ userId: it.userId, ok: false, error: String(e?.message || e) })
      }
    }
    return { count: items.length, results }
  }

  @Post('/events/trigger')
  async triggerEvent(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: { kind: 'revolution' | 'gekokujo' | 'custom'; windowFrom?: string; windowTo?: string; payload?: any }
  ) {
    requireAdmin(token)
    const { kind, windowFrom, windowTo, payload } = body || ({} as any)
    if (!kind) throw new Error('missing_kind')
    const ev = await this.prisma.event.create({
      data: {
        kind,
        windowFrom: windowFrom ? new Date(windowFrom) : null,
        windowTo: windowTo ? new Date(windowTo) : null,
        payload: (payload ?? null) as unknown as Prisma.InputJsonValue,
        triggeredBy: 'admin'
      }
    })
    return ev
  }

  @Post('/events/schedule')
  async scheduleEvents(
    @Headers('x-admin-token') token: string | undefined,
    @Body() body: { items: { kind: 'revolution' | 'gekokujo' | 'custom'; windowFrom?: string; windowTo?: string; payload?: any }[] }
  ) {
    requireAdmin(token)
    const items = body?.items || []
    const created = []
    for (const it of items) {
      const ev = await this.prisma.event.create({
        data: {
          kind: it.kind,
          windowFrom: it.windowFrom ? new Date(it.windowFrom) : null,
          windowTo: it.windowTo ? new Date(it.windowTo) : null,
          payload: (it.payload ?? null) as unknown as Prisma.InputJsonValue,
          triggeredBy: 'admin'
        }
      })
      created.push(ev)
    }
    return { count: created.length, created }
  }

  @Get('/tiers')
  async listTiers(@Headers('x-admin-token') token?: string) {
    requireAdmin(token)
    const tiers = await this.prisma.tier.findMany({ orderBy: { id: 'asc' } })
    return tiers
  }

  @Post('/tiers/:id')
  async updateTier(
    @Headers('x-admin-token') token: string | undefined,
    @Param('id') id: string,
    @Body() body: { name?: string; obligationsSchema?: any; perksSchema?: any; bumpVersion?: boolean }
  ) {
    requireAdmin(token)
    const tierId = Number(id)
    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.obligationsSchema !== undefined) data.obligationsSchema = body.obligationsSchema as any
    if (body.perksSchema !== undefined) data.perksSchema = body.perksSchema as any
    if (body.bumpVersion) {
      data.rulesVersion = { increment: 1 }
      data.activeFrom = new Date()
    }
    const t = await this.prisma.tier.update({ where: { id: tierId }, data })
    return t
  }

  @Get('/distribution')
  async distribution(
    @Headers('x-admin-token') token?: string,
    @Query('days') daysQ?: string
  ) {
    requireAdmin(token)
    const days = Math.min(Math.max(Number(daysQ || 30), 1), 180)
    const rows = await this.prisma.tierDistributionDaily.findMany({ orderBy: { day: 'asc' } })
    const last = rows.slice(-days)
    return last
  }
}
