import { Module } from '@nestjs/common'
import { RouletteWinsService } from './roulette-wins.service'
import { RouletteWinsController } from './roulette-wins.controller'

@Module({
  providers: [RouletteWinsService],
  controllers: [RouletteWinsController]
})
export class RouletteWinsModule {}

