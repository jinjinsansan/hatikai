import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

export async function GET(req: NextRequest) {
  if (req.cookies.get('admin_authed')?.value !== '1') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const tierId = searchParams.get('tierId') || ''
  const limit = searchParams.get('limit') || '50'
  const url = new URL(`${API_URL}/admin/users`)
  if (q) url.searchParams.set('q', q)
  if (tierId) url.searchParams.set('tierId', tierId)
  url.searchParams.set('limit', limit)
  const res = await fetch(url.toString(), { headers: { 'x-admin-token': ADMIN_TOKEN } })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

