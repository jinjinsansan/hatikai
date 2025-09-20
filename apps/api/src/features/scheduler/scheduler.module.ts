import { Module } from '@nestjs/common'
import { SchedulerService } from './scheduler.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { TiersModule } from '../tiers/tiers.module'
import { ObligationsModule } from '../obligations/obligations.module'
import { RouletteModule } from '../roulette/roulette.module'

@Module({
  imports: [
    PrismaModule,
    TiersModule,
    ObligationsModule,
    RouletteModule
  ],
  providers: [SchedulerService],
  exports: [SchedulerService]
})
export class SchedulerModule {}