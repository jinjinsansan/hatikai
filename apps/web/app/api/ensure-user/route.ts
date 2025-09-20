import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email, authProviderId } = body || {}
  const auth = req.headers.get('authorization') || ''
  if (!auth) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const res = await fetch(`${API_URL}/dev/users/ensure`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: auth }, body: JSON.stringify({ email, authProviderId })
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
