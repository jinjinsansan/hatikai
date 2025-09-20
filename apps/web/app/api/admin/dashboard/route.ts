import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

export async function GET(req: NextRequest) {
  const authed = req.cookies.get('admin_authed')?.value === '1'
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const res = await fetch(`${API_URL}/admin/dashboard`, {
    headers: { 'x-admin-token': ADMIN_TOKEN }
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
