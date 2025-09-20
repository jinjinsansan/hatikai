import { Controller, Get, Headers, Query } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

function requireAdmin(tokenHeader: string | undefined) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) throw new Error('admin_not_configured')
  if (!tokenHeader || tokenHeader !== expected) throw new Error('forbidden')
}

@Controller('/admin')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get('/audit')
  async listAudit(
    @Headers('x-admin-token') token?: string,
    @Query('limit') limitQ?: string,
    @Query('action') action?: string,
    @Query('role') role?: string,
    @Query('target') target?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    requireAdmin(token)
    const take = Math.min(Math.max(Number(limitQ || 100), 1), 500)
    const where: any = {}
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (role) where.actorRole = role as any
    if (target) where.target = { contains: target, mode: 'insensitive' }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    const logs = await this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take })
    return logs
  }

  @Get('/transitions')
  async listTransitions(@Headers('x-admin-token') token?: string, @Query('limit') limitQ?: string, @Query('userId') userId?: string) {
    requireAdmin(token)
    const take = Math.min(Math.max(Number(limitQ || 100), 1), 500)
    const trs = await this.prisma.tierTransition.findMany({ orderBy: { decidedAt: 'desc' }, take, include: { user: true }, where: userId ? { userId } : {} })
    return trs.map(t => ({
      id: t.id,
      userId: t.userId,
      userEmail: (t as any).user?.email || null,
      from: t.fromTierId,
      to: t.toTierId,
      decidedAt: t.decidedAt,
      reason: t.reason,
      modifiers: t.modifiers,
      baseProbs: t.baseProbs
    }))
  }
}
