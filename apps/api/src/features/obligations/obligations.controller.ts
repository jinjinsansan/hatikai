import { Body, Controller, Get, Param, Post, Query, UseGuards, Req } from '@nestjs/common'
import { ObligationsService } from './obligations.service'
import { SupabaseJwtGuard } from '../../auth/auth.guard'

@Controller()
export class ObligationsController {
  constructor(private readonly svc: ObligationsService) {}

  // Dev用に X-User-Id ヘッダーでユーザー識別（後でAuthに置換）
  @UseGuards(SupabaseJwtGuard)
  @Get('/me/obligations')
  async list(@Req() req: any, @Query('period') period: 'day' | 'week' | 'month' = 'day') {
    const userId = req.user?.id
    return await this.svc.listForUser(userId, period)
  }

  @UseGuards(SupabaseJwtGuard)
  @Post('/me/obligations/:id/progress')
  async progress(@Req() req: any, @Param('id') id: string, @Body() body: { kind: string; meta?: any }) {
    const userId = req.user?.id
    return await this.svc.addProgress(userId, id, body.kind, body.meta)
  }
}
