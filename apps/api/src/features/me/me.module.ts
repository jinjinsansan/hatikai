import { Module } from '@nestjs/common'
import { MeController } from './me.controller'
import { RouletteModule } from '../roulette/roulette.module'

@Module({
  imports: [RouletteModule],
  controllers: [MeController]
})
export class MeModule {}
