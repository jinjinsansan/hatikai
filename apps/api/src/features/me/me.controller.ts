import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { jstDayStart, nowJst } from '../../utils/time'
import { RouletteService } from '../roulette/roulette.service'
import { SupabaseJwtGuard } from '../../auth/auth.guard'

@Controller('/me')
export class MeController {
  constructor(private prisma: PrismaService, private roulette: RouletteService) {}

  @UseGuards(SupabaseJwtGuard)
  @Get('/tier-state')
  async tierState(@Req() req: any) {
    const userId = req.user?.id
    const state = await this.prisma.userTierState.findUnique({ where: { userId }, include: { tier: true } })
    if (!state) return { initialized: false }
    return {
      initialized: true,
      userId,
      tier: { id: state.tierId, name: state.tier.name },
      effectiveFrom: state.effectiveFrom,
      lockUntil: state.lockUntil,
      stayDays: state.stayDays
    }
  }

  @UseGuards(SupabaseJwtGuard)
  @Post('/login-ping')
  async loginPing(@Req() req: any) {
    const userId = req.user?.id
    const day = jstDayStart(nowJst())
    await this.prisma.loginLog.upsert({ where: { userId_day: { userId, day } }, update: {}, create: { userId, day } })
    return { ok: true, day }
  }

  @UseGuards(SupabaseJwtGuard)
  @Get('/roulette/modifiers')
  async modifiers(@Req() req: any) {
    const userId = req.user?.id
    const state = await this.prisma.userTierState.findUnique({ where: { userId } })
    if (!state) return { up: 0, down: 0, detail: {}, initialized: false }
    const m = await this.roulette["modifiers"].call(this.roulette, state, userId)
    return { ...m, initialized: true }
  }

  @UseGuards(SupabaseJwtGuard)
  @Get('/roulette/preview')
  async preview(@Req() req: any) {
    const userId = req.user?.id
    const pv = await this.roulette.preview(userId)
    return pv
  }

  @UseGuards(SupabaseJwtGuard)
  @Get('/history/tiers')
  async tierHistory(@Req() req: any) {
    const userId = req.user?.id
    const transitions = await this.prisma.tierTransition.findMany({ where: { userId }, orderBy: { decidedAt: 'desc' }, take: 50 })
    const state = await this.prisma.userTierState.findUnique({ where: { userId }, include: { tier: true } })
    return { current: state ? { id: state.tierId, name: state.tier.name } : null, transitions }
  }

  @UseGuards(SupabaseJwtGuard)
  @Get('/history/obligations')
  async obligationHistory(@Req() req: any) {
    const userId = req.user?.id
    const obs = await this.prisma.obligation.findMany({ where: { userId, period: 'day' as any }, orderBy: { issuedFor: 'desc' }, take: 30 })
    return obs
  }

  @UseGuards(SupabaseJwtGuard)
  @Get('/history/draws')
  async drawHistory(@Req() req: any) {
    const userId = req.user?.id
    const wins = await this.prisma.drawWin.findMany({ where: { userId }, orderBy: { decidedAt: 'desc' }, take: 30, include: { reward: true } })
    return wins
  }
}
