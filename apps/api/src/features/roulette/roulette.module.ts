import { Module } from '@nestjs/common'
import { RouletteService } from './roulette.service'
import { RouletteController } from './roulette.controller'

@Module({
  providers: [RouletteService],
  controllers: [RouletteController],
  exports: [RouletteService]
})
export class RouletteModule {}

