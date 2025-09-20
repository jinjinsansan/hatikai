import { Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(url, { signal: controller.signal }) } finally { clearTimeout(id) }
}

@Controller('/util')
export class ImgProxyController {
  @Get('/img-proxy')
  async proxy(@Query('url') url: string, @Query('w') wQ: string, @Query('h') hQ: string, @Res() res: Response) {
    try {
      const u = new URL(url)
      if (!/^https?:$/.test(u.protocol)) return res.status(400).json({ error: 'invalid_url' })
    } catch { return res.status(400).json({ error: 'invalid_url' }) }
    try {
      const r = await fetchWithTimeout(url, 8000)
      const ct = r.headers.get('content-type') || ''
      const len = Number(r.headers.get('content-length') || '0')
      if (!ct.startsWith('image/')) return res.status(400).json({ error: 'not_image' })
      if (len && len > 5_000_000) return res.status(400).json({ error: 'too_large' })
      res.setHeader('Cache-Control', 'public, max-age=3600')
      const raw = Buffer.from(await r.arrayBuffer())
      const w = Number(wQ || 0)
      const h = Number(hQ || 0)
      if ((w > 0 || h > 0) && (ct.startsWith('image/jpeg') || ct.startsWith('image/png') || ct.startsWith('image/webp'))) {
        try {
          // Lazy import sharp for environments without native deps
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const sharp = require('sharp')
          let img = sharp(raw)
          img = img.resize({ width: w || undefined, height: h || undefined, fit: 'inside' })
          const out = await img.toBuffer()
          res.setHeader('Content-Type', ct)
          return res.end(out)
        } catch (e) {
          // fallback: return original
          res.setHeader('Content-Type', ct)
          return res.end(raw)
        }
      } else {
        res.setHeader('Content-Type', ct)
        return res.end(raw)
      }
    } catch (e: any) {
      return res.status(500).json({ error: 'fetch_failed' })
    }
  }
}
