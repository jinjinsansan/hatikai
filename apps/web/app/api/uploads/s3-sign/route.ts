import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}))
  const res = await fetch(`${API_URL}/uploads/s3-sign`, { method:'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

