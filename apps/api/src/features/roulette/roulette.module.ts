import { Module } from '@nestjs/common'
import { RouletteService } from './roulette.service'
import { RouletteController } from './roulette.controller'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [RouletteService],
  controllers: [RouletteController],
  exports: [RouletteService]
})
export class RouletteModule {}

