import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.cookies.get('admin_authed')?.value !== '1') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_URL}/admin/tiers/${params.id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
