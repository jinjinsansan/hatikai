type KV = Record<string, any>

function humanizeKey(key: string): string {
  const map: Record<string, string> = {
    ads: '広告視聴',
    buy: '購入',
    login: 'ログイン',
    referral: '紹介',
    featured: '表示優遇',
    auto: '自動特典',
    boost: 'ブースト'
  }
  return map[key] || key
}

export function ObligationsView({ schema }: { schema: KV | null }) {
  if (!schema || Object.keys(schema).length === 0) return <div className="text-sm text-white/60">特に義務はありません</div>
  // schema は period keys(day/week/month) または key-value の可能性
  const periods = ['day', 'week', 'month']
  const entries: { label: string; items: [string, any][] }[] = []
  for (const p of periods) {
    if (schema[p]) entries.push({ label: p.toUpperCase(), items: Object.entries(schema[p]) })
  }
  if (!entries.length) entries.push({ label: 'ALL', items: Object.entries(schema) })
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.label} className="rounded border border-white/10 p-2">
          <div className="mb-1 text-xs text-white/60">{e.label}</div>
          <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            {e.items.map(([k, v]) => (
              <li key={k} className="rounded bg-white/5 px-2 py-1">
                <span className="text-white/80">{humanizeKey(k)}</span>: <b>{String(v)}</b>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function PerksView({ schema }: { schema: KV | null }) {
  if (!schema || Object.keys(schema).length === 0) return <div className="text-sm text-white/60">特典はありません</div>
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
      {Object.entries(schema).map(([k, v]) => (
        <li key={k} className="rounded bg-white/5 px-2 py-1">
          <span className="text-white/80">{humanizeKey(k)}</span>: <b>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</b>
        </li>
      ))}
    </ul>
  )
}

