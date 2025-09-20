import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../../auth/auth.guard'
import { AdsService } from './ads.service'

@UseGuards(SupabaseJwtGuard)
@Controller('/ads')
export class AdsController {
  constructor(private ads: AdsService) {}

  @Get('/slot/:slotId')
  async getSlot(@Req() req: any, @Param('slotId') slotId: string) {
    const userId = req.user.id
    // In real-world, return creative or configuration; here we just issue a token
    const tok = await this.ads.issueViewToken(userId, slotId)
    return { slotId, ...tok }
  }

  @Post('/view-complete')
  async complete(@Req() req: any, @Body() body: { token: string; metrics: { durationMs: number; focusRatio?: number } }) {
    const userId = req.user.id
    return await this.ads.completeView(userId, body.token, body.metrics)
  }
}

