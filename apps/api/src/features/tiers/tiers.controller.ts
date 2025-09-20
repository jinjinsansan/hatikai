import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('/tiers')
export class TiersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    const tiers = await this.prisma.tier.findMany({ orderBy: { id: 'asc' } })
    return tiers
  }
}
