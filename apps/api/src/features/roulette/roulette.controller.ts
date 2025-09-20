import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common'
import { RouletteService } from './roulette.service'
import { SupabaseJwtGuard } from '../../auth/auth.guard'

@Controller('/roulette')
export class RouletteController {
  constructor(private roulette: RouletteService) {}

  // ルーレットプレビュー（確率表示）
  @Get('preview')
  @UseGuards(SupabaseJwtGuard)
  async preview(@Request() req: any) {
    return await this.roulette.preview(req.user.id)
  }

  // 初回ルーレット実行
  @Post('initial')
  @UseGuards(SupabaseJwtGuard)
  async runInitial(@Request() req: any) {
    const user = await this.roulette.prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) throw new Error('User not found')
    return await this.roulette.runForUser(user)
  }

  // 管理者用: 全ユーザーのルーレット実行
  @Post('/admin/roulette/run')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async runAll() {
    return await this.roulette.runDailyRouletteForAll()
  }

  // 管理者用: 特定ユーザーのルーレット強制実行
  @Post('force/:userId')
  @UseGuards(SupabaseJwtGuard) // TODO: Add admin check
  async forceRoulette(@Param('userId') userId: string) {
    const user = await this.roulette.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')
    return await this.roulette.runForUser(user)
  }
}

