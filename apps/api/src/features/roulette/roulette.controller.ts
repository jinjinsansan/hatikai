import { Controller, Post } from '@nestjs/common'
import { RouletteService } from './roulette.service'

@Controller()
export class RouletteController {
  constructor(private roulette: RouletteService) {}

  @Post('/admin/roulette/run')
  async runAll() {
    return await this.roulette.runDailyRouletteForAll()
  }
}

