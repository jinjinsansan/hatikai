'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function FloorPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tier, setTier] = useState<number | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s)=> setAccessToken(s?.access_token ?? null))
    return () => { sub.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    const load = async () => {
      if (!accessToken) return
      const r = await fetch('/api/me/tier-state', { headers: { authorization: `Bearer ${accessToken}` } })
      const d = await r.json()
      if (r.ok && d?.tier?.id) setTier(d.tier.id)
    }
    load()
  }, [accessToken])
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="text-5xl md:text-6xl font-extrabold">{tier ? `${tier}階` : 'ログインしてください'}</div>
    </main>
  )
}

