"use client"
import { useEffect, useState } from 'react'
import Section from '../../components/Section'
import { supabase } from '../../lib/supabaseClient'

export default function HistoryPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tierHist, setTierHist] = useState<any | null>(null)
  const [obHist, setObHist] = useState<any[]>([])
  const [wins, setWins] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAccessToken(s?.access_token ?? null))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!accessToken) return
    const h = { headers: { authorization: `Bearer ${accessToken}` } }
    fetch('/api/me/history/tiers', h).then(async r => setTierHist(r.ok ? await r.json() : null))
    fetch('/api/me/history/obligations', h).then(async r => setObHist(r.ok ? await r.json() : []))
    fetch('/api/me/history/draws', h).then(async r => setWins(r.ok ? await r.json() : []))
  }, [accessToken])

  return (
    <main>
      <h1 className="text-2xl font-bold">マイ履歴</h1>
      <Section title="階層の推移（最近）">
        {tierHist ? (
          <div className="space-y-2">
            <div className="text-sm">現在: {tierHist.current ? `${tierHist.current.id}階（${tierHist.current.name}）` : '-'}</div>
            <ul className="divide-y divide-white/10">
              {tierHist.transitions.map((t: any) => (
                <li key={t.id} className="py-2 text-sm">
                  <span className={`inline-block h-3 w-3 rounded tier-${t.toTierId} mr-2`} />
                  <span className="font-mono">{new Date(t.decidedAt).toLocaleString()}</span> : {t.fromTierId ?? '-'} → {t.toTierId}
                  {t.reason && <span className="ml-2 text-white/60">({t.reason})</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : <div className="text-sm text-white/60">読み込み中...</div>}
      </Section>
      <Section title="日次義務の達成履歴（最近30日）">
        {obHist.length ? (
          <div className="grid grid-cols-7 gap-2">
            {obHist.map((o) => (
              <div key={o.id} className={`rounded p-2 text-center text-xs ${o.status==='completed' ? 'bg-emerald-600' : o.status==='expired' ? 'bg-red-600' : 'bg-white/10'}`}>
                <div className="font-mono">{new Date(o.issuedFor).toISOString().slice(5,10)}</div>
                <div className="mt-1">{o.status}</div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-white/60">データがありません</div>}
      </Section>
      <Section title="抽選の当選履歴（最近）">
        {wins.length ? (
          <ul className="divide-y divide-white/10 text-sm">
            {wins.map(w => (
              <li key={w.id} className="py-2">
                <span className="font-mono">{new Date(w.decidedAt).toLocaleString()}</span> - {w.reward?.meta?.name || w.reward?.kind || 'Reward'}
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-white/60">当選履歴はありません</div>}
      </Section>
    </main>
  )
}

