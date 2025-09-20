import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const res = await fetch(`${API_URL}/draws/enter`, { method: 'POST', headers: { authorization: auth } })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

