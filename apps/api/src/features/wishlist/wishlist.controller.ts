import { Body, Controller, Delete, Get, Param, Post, Patch, Req, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../../auth/auth.guard'
import { WishlistService } from './wishlist.service'

@UseGuards(SupabaseJwtGuard)
@Controller('/me/wish-items')
export class WishlistController {
  constructor(private svc: WishlistService) {}

  @Get()
  async list(@Req() req: any) {
    return await this.svc.list(req.user.id)
  }

  @Post()
  async add(@Req() req: any, @Body() body: { title: string; imageUrl?: string; productUrl: string; weight?: number }) {
    return await this.svc.add(req.user.id, body)
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return await this.svc.remove(req.user.id, id)
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: { title?: string; imageUrl?: string; productUrl?: string; weight?: number; active?: boolean }) {
    return await this.svc.update(req.user.id, id, body)
  }

  @Post(':id/click')
  async click(@Req() req: any, @Param('id') id: string) {
    return await this.svc.click(req.user.id, id)
  }
}
