import { Module } from '@nestjs/common'
import { TiersController } from './tiers.controller'
import { TiersService } from './tiers.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [TiersController],
  providers: [TiersService],
  exports: [TiersService]
})
export class TiersModule {}

