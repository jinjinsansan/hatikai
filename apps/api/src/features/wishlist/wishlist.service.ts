import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

function sanitizeAmazonUrl(url: string): string {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('amazon.')) return url
    // remove affiliate parameters commonly used
    u.searchParams.delete('tag')
    u.searchParams.delete('linkCode')
    u.searchParams.delete('ascsubtag')
    u.searchParams.delete('creativeASIN')
    u.searchParams.delete('camp')
    u.searchParams.delete('creative')
    return u.toString()
  } catch { return url }
}

function extractASIN(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('amazon.')) return null
    // patterns: /dp/ASIN, /gp/product/ASIN, /-/dp/ASIN
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)
    return m ? m[1] : null
  } catch { return null }
}

async function tryFetchOg(url: string): Promise<{ imageUrl?: string; title?: string } | null> {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'ja,en;q=0.9'
  } as any
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { headers, signal: controller.signal } as any)
    if (!res.ok) return null
    const html = await res.text()
    const get = (name: string) => {
      const re = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
      const m = html.match(re)
      if (m) return m[1]
      const re2 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
      const m2 = html.match(re2)
      return m2 ? m2[1] : null
    }
    const imageUrl = get('og:image') || undefined
    const title = get('og:title') || undefined
    return { imageUrl, title }
  } catch { return null } finally { clearTimeout(id) }
}

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return await this.prisma.wishItem.findMany({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } })
  }

  async add(userId: string, input: { title: string; imageUrl?: string; productUrl: string; weight?: number }) {
    const productUrl = sanitizeAmazonUrl(input.productUrl)
    let title = input.title
    let imageUrl = input.imageUrl || ''
    const baseWeight = Number.isFinite(input.weight as any) ? Number(input.weight) : 2
    if (!imageUrl) {
      // Try OG image
      const og = await tryFetchOg(productUrl)
      if (og?.imageUrl) imageUrl = og.imageUrl
      if (!title && og?.title) title = og.title
      // Try ASIN-based fallback if still missing
      if (!imageUrl) {
        const asin = extractASIN(productUrl)
        if (asin) {
          imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`
        }
      }
    }
    if (!title) title = 'Amazon商品'
    return await this.prisma.wishItem.create({ data: { userId, title, imageUrl, productUrl, weight: baseWeight } })
  }

  async update(userId: string, id: string, input: { title?: string; imageUrl?: string; productUrl?: string; weight?: number; active?: boolean }) {
    const item = await this.prisma.wishItem.findUnique({ where: { id } })
    if (!item || item.userId !== userId) throw new Error('not_found')
    const data: any = {}
    if (typeof input.title === 'string') data.title = input.title
    if (typeof input.imageUrl === 'string') data.imageUrl = input.imageUrl
    if (typeof input.productUrl === 'string') data.productUrl = sanitizeAmazonUrl(input.productUrl)
    if (typeof input.weight === 'number' && isFinite(input.weight)) data.weight = input.weight
    if (typeof input.active === 'boolean') data.active = input.active
    const updated = await this.prisma.wishItem.update({ where: { id }, data })
    return updated
  }

  async click(userId: string, id: string) {
    const item = await this.prisma.wishItem.findUnique({ where: { id } })
    if (!item || item.userId !== userId) throw new Error('not_found')
    const newWeight = Math.min((item.weight || 1) + 0.1, 5)
    const updated = await this.prisma.wishItem.update({ where: { id }, data: { clickCount: { increment: 1 }, lastClickedAt: new Date(), weight: newWeight } })
    return { ok: true, weight: updated.weight, clickCount: updated.clickCount }
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.wishItem.findUnique({ where: { id } })
    if (!item || item.userId !== userId) throw new Error('not_found')
    await this.prisma.wishItem.update({ where: { id }, data: { active: false } })
    return { ok: true }
  }
}
