import { Injectable } from '@nestjs/common'
import { ActorRole, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: { actorRole: ActorRole; actorId?: string | null; action: string; target?: string | null; payload?: any }) {
    const { actorRole, actorId, action, target, payload } = params
    await this.prisma.auditLog.create({
      data: {
        actorRole,
        actorId: actorId ?? null,
        action,
        target: target ?? null,
        payload: (payload ?? null) as unknown as Prisma.InputJsonValue
      }
    })
  }
}

