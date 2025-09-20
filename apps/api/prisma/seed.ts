import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed 1..8 tiers with minimal schemas
  const tiers = [
    { id: 1, name: '最下層', obligationsSchema: { day: { buy: 0, ads: 3 } }, perksSchema: {} },
    { id: 2, name: '借金階層', obligationsSchema: { day: { buy: 0, ads: 2 } }, perksSchema: {} },
    { id: 3, name: '条件付き平等', obligationsSchema: { day: { buy: 0, ads: 1 } }, perksSchema: {} },
    { id: 4, name: '選択の自由', obligationsSchema: { week: { buy: 0, ads: 0 } }, perksSchema: {} },
    { id: 5, name: '優遇開始', obligationsSchema: { month: { buy: 0 } }, perksSchema: {} },
    { id: 6, name: '投資家気分', obligationsSchema: {}, perksSchema: { boost: 'monthly' } },
    { id: 7, name: 'ほぼ特権階級', obligationsSchema: {}, perksSchema: { auto: 'weekly' } },
    { id: 8, name: '最上階', obligationsSchema: {}, perksSchema: { featured: true } }
  ]

  for (const [i, t] of tiers.entries()) {
    await prisma.tier.upsert({
      where: { id: t.id },
      update: { name: t.name, obligationsSchema: t.obligationsSchema as any, perksSchema: t.perksSchema as any, rulesVersion: 1 },
      create: { id: t.id, name: t.name, obligationsSchema: t.obligationsSchema as any, perksSchema: t.perksSchema as any, rulesVersion: 1 }
    })
  }
  console.log('Seeded tiers 1..8')
  // Rewards (sample)
  const rewards = [
    { kind: 'badge', weight: 1.0, meta: { name: 'Lucky Badge', color: 'gold' } },
    { kind: 'boost', weight: 0.5, meta: { name: 'Next Roulette Boost' } }
  ] as any[]
  for (const r of rewards) {
    await prisma.reward.create({ data: r }).catch(()=>{})
  }
  console.log('Seeded rewards')
}

main().finally(async () => {
  await prisma.$disconnect()
})
