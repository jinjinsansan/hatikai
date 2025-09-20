import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RouletteWinsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, limit = 20) {
    return await this.prisma.rouletteWin.findMany({ where: { userId }, orderBy: { decidedAt: 'desc' }, take: Math.min(Math.max(limit,1), 50) })
  }

  async add(userId: string, body: { itemId: string; title: string; imageUrl: string; productUrl: string }) {
    const win = await this.prisma.rouletteWin.create({ data: { userId, ...body } })
    return win
  }
}

