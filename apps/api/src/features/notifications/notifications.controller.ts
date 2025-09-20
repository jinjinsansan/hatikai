import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../../auth/auth.guard'
import { NotificationsService } from './notifications.service'

@Controller()
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @UseGuards(SupabaseJwtGuard)
  @Post('/me/notifications/token')
  async register(@Req() req: any, @Body() body: { token: string; platform?: string }) {
    const userId = req.user.id
    return await this.svc.registerToken(userId, body.token, body.platform || 'web')
  }

  @Post('/admin/notify/test')
  async test(@Headers('x-admin-token') token: string | undefined, @Body() body: { userId?: string; title: string; message: string }) {
    const expected = process.env.ADMIN_TOKEN
    if (!expected || token !== expected) throw new Error('forbidden')
    if (body.userId) return await this.svc.sendToUser(body.userId, body.title, body.message)
    return await this.svc.sendBroadcast(body.title, body.message)
  }
}
