"use client"
import { useEffect, useState } from 'react'
import Section from '../../components/Section'
import { ObligationsView, PerksView } from '../../components/SchemaCards'
import { supabase } from '../../lib/supabaseClient'

export default function TiersPage() {
  const [tiers, setTiers] = useState<any[]>([])
  const [tierState, setTierState] = useState<{ id: number; name: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tiers').then(async r => setTiers(r.ok ? await r.json() : []))
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAccessToken(s?.access_token ?? null))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/me/tier-state', { headers: { authorization: `Bearer ${accessToken}` } })
      .then(async r => { if (r.ok) { const d = await r.json(); setTierState(d.tier ?? null) } })
  }, [accessToken])

  return (
    <main>
      <h1 className="text-2xl font-bold">階層ステータス</h1>
      <Section title="各階層のルール">
        <div className="grid gap-3 md:grid-cols-2">
          {tiers.map((t) => (
            <div key={t.id} className="card">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-lg font-semibold">{t.id}階：{t.name}</div>
                {tierState?.id === t.id && <span className="rounded bg-white/20 px-2 py-0.5 text-xs">現在</span>}
              </div>
              <div className="mt-2 text-sm text-white/80">義務（例）</div>
              <ObligationsView schema={t.obligationsSchema} />
              <div className="mt-2 text-sm text-white/80">特典（例）</div>
              <PerksView schema={t.perksSchema} />
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
