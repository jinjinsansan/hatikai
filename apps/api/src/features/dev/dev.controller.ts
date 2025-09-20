import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SupabaseJwtGuard } from '../../auth/auth.guard'

function sampleTier(): number {
  const dist = [0.30, 0.20, 0.15, 0.12, 0.10, 0.08, 0.03, 0.02]
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < dist.length; i++) { acc += dist[i]; if (r <= acc) return i + 1 }
  return 8
}

@Controller('/dev')
export class DevController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(SupabaseJwtGuard)
  @Post('/users/ensure')
  async ensureUser(@Req() req: any, @Body() body: { email?: string; authProviderId?: string; handle?: string }) {
    // 優先: JWTからsupabaseのユーザーID/メールを取得
    const jwtEmail = req.user?.email as string | undefined
    const jwtSub = req.user?.id as string | undefined
    const email = body?.email || jwtEmail
    const authProviderId = body?.authProviderId || jwtSub
    const handle = body?.handle
    if (!email && !authProviderId) throw new Error('email_or_authProviderId_required')
    let user = await this.prisma.user.findFirst({ where: { OR: [ email ? { email } : undefined, authProviderId ? { authProviderId } : undefined ].filter(Boolean) as any } })
    if (!user) {
      user = await this.prisma.user.create({ data: { email, authProviderId, handle, ageConfirmed: true } })
    }
    const state = await this.prisma.userTierState.findUnique({ where: { userId: user.id } })
    if (!state) {
      await this.prisma.userTierState.create({ data: { userId: user.id, tierId: sampleTier() } })
    }
    return { userId: user.id }
  }

  @Post('/obligations/generate')
  async genObl(@Body() body: { userId: string }) {
    if (!body?.userId) throw new Error('userId_required')
    const tierState = await this.prisma.userTierState.findUnique({ where: { userId: body.userId } })
    if (!tierState) throw new Error('user_not_initialized')
    // Generate will be done by ObligationsService via cron; here we do nothing for brevity
    return { ok: true }
  }

  @Get('/users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { tierState: true } })
    return user
  }
}
