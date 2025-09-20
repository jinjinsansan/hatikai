import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  if (!url) return NextResponse.json({ error: 'missing_url' }, { status: 400 })
  const res = await fetch(`${API_URL}/util/fetch-og?url=${encodeURIComponent(url)}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

