import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

export async function GET(req: NextRequest) {
  if (req.cookies.get('admin_authed')?.value !== '1') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') || '100'
  const userId = searchParams.get('userId') || ''
  const url = new URL(`${API_URL}/admin/transitions`)
  url.searchParams.set('limit', limit)
  if (userId) url.searchParams.set('userId', userId)
  const res = await fetch(url.toString(), { headers: { 'x-admin-token': ADMIN_TOKEN } })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
