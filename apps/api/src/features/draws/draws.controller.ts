import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../../auth/auth.guard'
import { DrawsService } from './draws.service'

@UseGuards(SupabaseJwtGuard)
@Controller()
export class DrawsController {
  constructor(private svc: DrawsService) {}

  @Get('/me/draws')
  async status(@Req() req: any) {
    const userId = req.user.id
    return await this.svc.status(userId)
  }

  @Post('/draws/enter')
  async enter(@Req() req: any) {
    const userId = req.user.id
    return await this.svc.enter(userId)
  }
}

