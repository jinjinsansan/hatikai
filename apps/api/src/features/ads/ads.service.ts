import { Injectable } from '@nestjs/common'
import jwt from 'jsonwebtoken'
import { PrismaService } from '../../prisma/prisma.service'
import { jstDayStart, nowJst } from '../../utils/time'

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  async issueViewToken(userId: string, slotId: string) {
    const tid = crypto.randomUUID()
    const min = Number(process.env.MIN_AD_DURATION_SEC || 10)
    const secret = process.env.ADS_TOKEN_SECRET
    if (!secret) throw new Error('ads_secret_missing')
    const token = jwt.sign(
      { uid: userId, sid: slotId, tid, min },
      secret,
      { expiresIn: '15m' }
    )
    return { token, tid, min }
  }

  async completeView(userId: string, token: string, metrics: { durationMs: number; focusRatio?: number }) {
    const secret = process.env.ADS_TOKEN_SECRET
    if (!secret) throw new Error('ads_secret_missing')
    let payload: any
    try {
      payload = jwt.verify(token, secret)
    } catch {
      throw new Error('invalid_token')
    }
    if (payload.uid !== userId) throw new Error('user_mismatch')
    const minSec = Number(payload.min || 0)
    const okDuration = metrics.durationMs >= minSec * 1000
    const okFocus = (metrics.focusRatio ?? 1) >= 0.8
    if (!okDuration || !okFocus) throw new Error('not_qualified')

    // Record AdView (prevent replay via unique tokenId)
    await this.prisma.adView.create({
      data: {
        userId,
        adSlot: String(payload.sid),
        tokenId: String(payload.tid),
        verified: true
      }
    })

    // Increment today's day obligation progress.ads by 1 if exists
    const today = jstDayStart(nowJst())
    const ob = await this.prisma.obligation.findUnique({ where: { userId_period_issuedFor: { userId, period: 'day', issuedFor: today } } })
    if (ob) {
      const progress = (ob.progress as any) || {}
      progress.ads = (progress.ads || 0) + 1
      // completion check
      const schema = ob.schemaSnapshot as any
      let completed = true
      for (const k of Object.keys(schema)) {
        const required = Number(schema[k] || 0)
        if (required > 0) {
          const got = Number(progress[k] || 0)
          if (got < required) { completed = false; break }
        }
      }
      await this.prisma.obligation.update({ where: { id: ob.id }, data: { progress, status: completed ? 'completed' : ob.status } })
    }

    return { ok: true }
  }
}

