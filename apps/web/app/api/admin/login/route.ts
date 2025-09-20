import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token || '')
  const expected = process.env.ADMIN_TOKEN || ''
  if (!expected) return NextResponse.json({ error: 'admin_not_configured' }, { status: 500 })
  if (token !== expected) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_authed', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
  return res
}

