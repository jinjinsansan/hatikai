import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'day'
  if (!auth) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const res = await fetch(`${API_URL}/me/obligations?period=${encodeURIComponent(period)}`, { headers: { authorization: auth } })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
