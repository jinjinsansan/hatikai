import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_authed', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}

