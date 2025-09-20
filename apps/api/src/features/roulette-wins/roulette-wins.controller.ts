import { Controller, Get, Post, Query, Req, Body, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../../auth/auth.guard'
import { RouletteWinsService } from './roulette-wins.service'

@UseGuards(SupabaseJwtGuard)
@Controller('/me/roulette/wins')
export class RouletteWinsController {
  constructor(private svc: RouletteWinsService) {}

  @Get()
  async list(@Req() req: any, @Query('limit') limitQ?: string) {
    return await this.svc.list(req.user.id, Number(limitQ || 20))
  }

  @Post()
  async add(@Req() req: any, @Body() body: { itemId: string; title: string; imageUrl: string; productUrl: string }) {
    return await this.svc.add(req.user.id, body)
  }
}

