import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:3001'

export async function GET(_req: NextRequest) {
  const res = await fetch(`${API_URL}/tiers`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

