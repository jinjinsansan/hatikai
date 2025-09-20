import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import admin from 'firebase-admin'

@Injectable()
export class NotificationsService {
  private logger = new Logger(NotificationsService.name)
  private appInited = false

  private init() {
    if (this.appInited) return
    const key = process.env.FCM_SERVER_KEY
    if (!key) {
      this.logger.warn('FCM_SERVER_KEY not set; notifications disabled')
      return
    }
    try {
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() })
      }
      this.appInited = true
    } catch (e) {
      // If applicationDefault not available, fallback to legacy token via direct API in send()
      this.logger.warn('firebase-admin init failed; will use legacy HTTP with server key')
      this.appInited = false
    }
  }

  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, token: string, platform: string = 'web') {
    await this.prisma.notificationToken.upsert({
      where: { token },
      update: { userId, active: true, platform },
      create: { userId, token, platform }
    })
    return { ok: true }
  }

  async sendToUser(userId: string, title: string, body: string) {
    const tokens = await this.prisma.notificationToken.findMany({ where: { userId, active: true } })
    if (!tokens.length) return { sent: 0 }
    const sent = await this.sendMany(tokens.map(t => t.token), title, body)
    return { sent }
  }

  async sendBroadcast(title: string, body: string) {
    const tokens = await this.prisma.notificationToken.findMany({ where: { active: true } })
    if (!tokens.length) return { sent: 0 }
    const sent = await this.sendMany(tokens.map(t => t.token), title, body)
    return { sent }
  }

  private async sendMany(tokens: string[], title: string, body: string): Promise<number> {
    const serverKey = process.env.FCM_SERVER_KEY
    if (!serverKey) return 0
    this.init()
    try {
      if (this.appInited) {
        const msg: admin.messaging.MulticastMessage = { tokens, notification: { title, body } }
        const res = await admin.messaging().sendEachForMulticast(msg)
        return res.successCount
      }
    } catch (e) {
      this.logger.warn('firebase-admin send failed; fallback to legacy')
    }
    // legacy HTTP v1 fallback with server key
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `key=${serverKey}` },
      body: JSON.stringify({ registration_ids: tokens, notification: { title, body } })
    })
    if (!res.ok) return 0
    const data = await res.json().catch(() => ({}))
    return Number(data?.success || 0)
  }
}

