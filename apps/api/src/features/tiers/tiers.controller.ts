import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common'
import { TiersService } from './tiers.service'
import { SupabaseJwtGuard } from '../../auth/auth.guard'

@Controller('/tiers')
export class TiersController {
  constructor(private readonly tiersService: TiersService) {}

  // 階層一覧を取得
  @Get()
  async getTiers() {
    return await this.tiersService.getTiers()
  }

  // ユーザーの現在の階層を取得
  @Get('my-tier')
  @UseGuards(SupabaseJwtGuard)
  async getMyTier(@Request() req: any) {
    return await this.tiersService.getUserTier(req.user.id)
  }

  // 指定ユーザーの階層を取得（管理者用）
  @Get('user/:userId')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async getUserTier(@Param('userId') userId: string) {
    return await this.tiersService.getUserTier(userId)
  }

  // 初回階層割り当て（ルーレット）
  @Post('assign')
  @UseGuards(SupabaseJwtGuard)
  async assignInitialTier(@Request() req: any) {
    return await this.tiersService.assignInitialTier(req.user.id)
  }

  // 階層変更（毎日0時実行用）
  @Post('change/:userId')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async changeTier(@Param('userId') userId: string) {
    return await this.tiersService.changeTier(userId)
  }

  // 階層分布を取得（管理画面用）
  @Get('distribution')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async getTierDistribution() {
    return await this.tiersService.getTierDistribution()
  }

  // 強制階層変更（管理者用）
  @Post('force-change')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async forceChangeTier(
    @Body() body: { userId: string; tierId: number; reason: string }
  ) {
    return await this.tiersService.forceChangeTier(
      body.userId,
      body.tierId,
      body.reason
    )
  }

  // 階層を初期化（管理者用）
  @Post('initialize')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async initializeTiers() {
    return await this.tiersService.initializeTiers()
  }
}
