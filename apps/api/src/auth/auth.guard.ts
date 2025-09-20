import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  id: string
  email?: string
}

declare module 'http' {
  interface IncomingMessage {
    user?: AuthUser
  }
}

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser; headers: any }>()
    const auth = req.headers['authorization'] as string | undefined
    if (!auth || !auth.startsWith('Bearer ')) return false
    const token = auth.slice('Bearer '.length)
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) return false
    try {
      const decoded: any = jwt.verify(token, secret)
      // Supabase: sub = user id
      req.user = { id: decoded.sub, email: decoded.email }
      return true
    } catch {
      return false
    }
  }
}

