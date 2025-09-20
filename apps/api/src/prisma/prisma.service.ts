import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore - Prisma v5 changed the typing for $on
    this.$on('beforeExit', async () => {
      await app.close()
    })
  }
}
