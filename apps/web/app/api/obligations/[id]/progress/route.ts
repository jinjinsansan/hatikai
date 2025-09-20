import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('authorization') || ''
  if (!auth) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_URL}/me/obligations/${params.id}/progress`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
