import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  hello() {
    return { name: 'hachikai-api', status: 'ok' }
  }
}
