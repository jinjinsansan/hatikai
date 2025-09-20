import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private isConnected = false

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // 接続タイムアウトを延長
      log: ['query', 'error', 'warn'],
    })
  }

  async onModuleInit() {
    // 接続をスキップして、必要時に接続
    console.log('⚠️ Lazy connection mode - will connect on first query')
    this.isConnected = false
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore - Prisma v5 changed the typing for $on
    this.$on('beforeExit', async () => {
      await app.close()
    })
  }
}
