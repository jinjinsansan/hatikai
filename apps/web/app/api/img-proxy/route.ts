import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''
  if (!url) return NextResponse.json({ error: 'missing_url' }, { status: 400 })
  const res = await fetch(`${API_URL}/util/img-proxy?url=${encodeURIComponent(url)}`)
  const headers = new Headers(res.headers)
  const body = await res.arrayBuffer()
  return new NextResponse(body, { status: res.status, headers })
}

