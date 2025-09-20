import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { nowJst, jstYmd, isJstMidnight } from './utils/time'
import { RouletteService } from './features/roulette/roulette.service'
import { ObligationsService } from './features/obligations/obligations.service'
import { PrismaService } from './prisma/prisma.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`🚀 Server is running on http://localhost:${port}`)

  // 簡易スケジューラ: JST 0:00に日次ルーレットを実行（重複防止）
  // Skip scheduler if database is not connected
  try {
    const roulette = app.get(RouletteService)
    const obligations = app.get(ObligationsService)
    const prisma = app.get(PrismaService)
  let lastRunYmd = ''
  setInterval(async () => {
    const now = nowJst()
    const ymd = jstYmd(now)
    if (isJstMidnight(now) && lastRunYmd !== ymd) {
      lastRunYmd = ymd
      try {
        // 義務の前日分を失効、当日分を発行
        const expired = await obligations.expireOldPending()
        const created = await obligations.generateForAllUsers()
        const r = await roulette.runDailyRouletteForAll()
        // 日次Tier分布のスナップショット
        const dist = await prisma.userTierState.groupBy({ by: ['tierId'], _count: true })
        const counts: Record<string, number> = {}
        for (let i = 1; i <= 8; i++) counts[i] = 0
        for (const d of dist) counts[String(d.tierId)] = d._count
        await prisma.tierDistributionDaily.upsert({
          where: { day: new Date(new Date(ymd).toISOString()) },
          update: { counts },
          create: { day: new Date(new Date(ymd).toISOString()), counts }
        })
        console.log(`[cron ${ymd}] obligations expired=${expired} created=${created} roulette processed=${r.processed}`)
      } catch (e) {
        console.error('[roulette] failed', e)
      }
    }
  }, 30 * 1000)
  } catch (error) {
    console.log('⚠️ Scheduler not started due to database connection issues')
  }
}

bootstrap()
