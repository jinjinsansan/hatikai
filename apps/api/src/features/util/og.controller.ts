import { Controller, Get, Query } from '@nestjs/common'

async function fetchWithTimeout(url: string, opts: { timeoutMs?: number; headers?: Record<string,string> } = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: opts.headers })
    return res
  } finally {
    clearTimeout(id)
  }
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m2 = html.match(re2)
  return m2 ? m2[1] : null
}

@Controller('/util')
export class OgController {
  @Get('/fetch-og')
  async fetchOg(@Query('url') url?: string) {
    if (!url) return { error: 'missing_url' }
    let u: URL
    try { u = new URL(url) } catch { return { error: 'invalid_url' } }
    if (!u.hostname.includes('amazon.')) return { error: 'not_amazon' }

    const headers = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'ja,en;q=0.9'
    }
    try {
      const res = await fetchWithTimeout(url, { timeoutMs: 8000, headers })
      if (!res.ok) return { error: 'fetch_failed', status: res.status }
      const html = await res.text()
      const image = extractMeta(html, 'og:image')
      const title = extractMeta(html, 'og:title')
      if (!image) return { error: 'og_image_not_found' }
      return { imageUrl: image, title: title ?? null }
    } catch (e: any) {
      return { error: 'fetch_error', message: String(e?.message || e) }
    }
  }
}

