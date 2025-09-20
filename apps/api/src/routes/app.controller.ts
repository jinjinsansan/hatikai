import { Controller, Get } from '@nestjs/common'
import { AppService } from '../services/app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  health() {
    return { ok: true, ts: new Date().toISOString() }
  }

  @Get('/')
  root() {
    return this.appService.hello()
  }
}
