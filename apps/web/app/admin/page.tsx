"use client"
import { useEffect, useState } from 'react'
import Section from '@/components/Section'

export default function AdminPage() {
  const [dash, setDash] = useState<any>(null)
  const [audit, setAudit] = useState<any[]>([])
  const [transitions, setTransitions] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [tierId, setTierId] = useState(1)
  const [lockDays, setLockDays] = useState(0)
  const [eventKind, setEventKind] = useState<'revolution'|'gekokujo'|'custom'>('revolution')
  const [msg, setMsg] = useState('')
  const [tiers, setTiers] = useState<any[]>([])
  const [editTierId, setEditTierId] = useState<number>(1)
  const [editName, setEditName] = useState<string>('')
  const [editObl, setEditObl] = useState<string>('{}')
  const [editPerks, setEditPerks] = useState<string>('{}')
  const [bumpVersion, setBumpVersion] = useState<boolean>(true)
  const [bulkCsv, setBulkCsv] = useState<string>('userId,tierId,lockDays\n')
  const [schedKind, setSchedKind] = useState<'revolution'|'gekokujo'|'custom'>('revolution')
  const [schedFrom, setSchedFrom] = useState<string>('')
  const [schedTo, setSchedTo] = useState<string>('')
  const [userQuery, setUserQuery] = useState<string>('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [auditAction, setAuditAction] = useState<string>('')
  const [auditRole, setAuditRole] = useState<string>('')
  const [auditTarget, setAuditTarget] = useState<string>('')
  const [auditFrom, setAuditFrom] = useState<string>('')
  const [auditTo, setAuditTo] = useState<string>('')
  const [expandedAuditId, setExpandedAuditId] = useState<string>('')
  const [distribution, setDistribution] = useState<any[]>([])

  const loadDashboard = async () => {
    const res = await fetch('/api/admin/dashboard')
    setDash(res.ok ? await res.json() : null)
  }
  const loadAudit = async () => {
    const res = await fetch('/api/admin/audit')
    setAudit(res.ok ? await res.json() : [])
  }
  const loadTransitions = async () => {
    const res = await fetch('/api/admin/transitions')
    setTransitions(res.ok ? await res.json() : [])
  }
  const loadTiers = async () => {
    const res = await fetch('/api/admin/tiers')
    if (!res.ok) return
    const data = await res.json()
    setTiers(data)
    if (data.length) {
      const t = data[0]
      setEditTierId(t.id); setEditName(t.name); setEditObl(JSON.stringify(t.obligationsSchema, null, 2)); setEditPerks(JSON.stringify(t.perksSchema, null, 2))
    }
  }
  const loadDistribution = async () => {
    const res = await fetch('/api/admin/distribution?days=30')
    setDistribution(res.ok ? await res.json() : [])
  }

  const forceTier = async () => {
    setMsg('')
    const res = await fetch('/api/admin/force-tier', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, tierId: Number(tierId), lockDays: Number(lockDays) || undefined }) })
    const data = await res.json()
    setMsg(res.ok ? 'OK: 強制変更しました' : `NG: ${data?.error || JSON.stringify(data)}`)
    loadDashboard()
  }

  const triggerEvent = async () => {
    setMsg('')
    const res = await fetch('/api/admin/events/trigger', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: eventKind }) })
    const data = await res.json()
    setMsg(res.ok ? `OK: イベント発火 ${data.id}` : `NG: ${data?.error || JSON.stringify(data)}`)
    loadDashboard()
  }
  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    location.href = '/admin/login'
  }

  useEffect(() => { loadDashboard(); loadTiers(); loadAudit(); loadTransitions(); loadDistribution() }, [])

  const onPickTier = (id: number) => {
    const t = tiers.find((x) => x.id === id)
    if (t) {
      setEditTierId(t.id); setEditName(t.name); setEditObl(JSON.stringify(t.obligationsSchema, null, 2)); setEditPerks(JSON.stringify(t.perksSchema, null, 2))
    }
  }

  const saveTier = async () => {
    setMsg('')
    let obl: any, perks: any
    try { obl = JSON.parse(editObl || '{}') } catch (e) { setMsg('Obligations JSONが不正です'); return }
    try { perks = JSON.parse(editPerks || '{}') } catch (e) { setMsg('Perks JSONが不正です'); return }
    const res = await fetch(`/api/admin/tiers/${editTierId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: editName, obligationsSchema: obl, perksSchema: perks, bumpVersion }) })
    const data = await res.json()
    if (res.ok) { setMsg('OK: ルールを保存しました'); loadTiers() } else { setMsg(`NG: ${data?.error || JSON.stringify(data)}`) }
  }

  const parseBulkCsv = (): { userId: string; tierId: number; lockDays?: number }[] => {
    const lines = bulkCsv.split(/\r?\n/).filter(l => l.trim().length)
    const rows = lines.slice(lines[0].includes(',') ? 1 : 0)
    const items: any[] = []
    for (const line of rows) {
      const [userId, tierIdStr, lockDaysStr] = line.split(',').map(s => s.trim())
      if (!userId) continue
      const tierId = Number(tierIdStr)
      const lockDays = lockDaysStr ? Number(lockDaysStr) : undefined
      if (!Number.isFinite(tierId)) continue
      items.push({ userId, tierId, lockDays })
    }
    return items
  }

  const runBulk = async () => {
    const items = parseBulkCsv()
    if (!items.length) { setMsg('CSVが空です'); return }
    const res = await fetch('/api/admin/force-tier/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) })
    const data = await res.json()
    setMsg(res.ok ? `OK: ${data.count}件処理` : `NG: ${data?.error || JSON.stringify(data)}`)
    loadDashboard()
  }

  const scheduleEvent = async () => {
    const items = [{ kind: schedKind, windowFrom: schedFrom || undefined, windowTo: schedTo || undefined }]
    const res = await fetch('/api/admin/events/schedule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) })
    const data = await res.json()
    setMsg(res.ok ? `OK: イベントを登録（${data.count}）` : `NG: ${data?.error || JSON.stringify(data)}`)
    loadDashboard()
  }

  const searchUsers = async () => {
    const params = new URLSearchParams()
    if (userQuery) params.set('q', userQuery)
    const res = await fetch(`/api/admin/users?${params.toString()}`)
    setUserResults(res.ok ? await res.json() : [])
  }

  const pickUser = (id: string) => {
    setUserId(id)
  }

  const loadTransitionsFiltered = async () => {
    const params = new URLSearchParams()
    if (filterUserId) params.set('userId', filterUserId)
    const res = await fetch(`/api/admin/transitions?${params.toString()}`)
    setTransitions(res.ok ? await res.json() : [])
  }

  const loadAuditFiltered = async () => {
    const params = new URLSearchParams()
    if (auditAction) params.set('action', auditAction)
    if (auditRole) params.set('role', auditRole)
    if (auditTarget) params.set('target', auditTarget)
    if (auditFrom) params.set('from', auditFrom)
    if (auditTo) params.set('to', auditTo)
    const res = await fetch(`/api/admin/audit?${params.toString()}`)
    setAudit(res.ok ? await res.json() : [])
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理パネル（暫定）</h1>
        <button className="btn" onClick={logout}>ログアウト</button>
      </div>
      <Section title="ダッシュボード">
        <pre className="rounded bg-black/40 p-3 text-xs leading-relaxed">{dash ? JSON.stringify(dash, null, 2) : 'loading...'}</pre>
        <div className="mt-4">
          <div className="mb-2 text-sm text-white/70">Tier分布推移（直近30日、JST）</div>
          <div className="space-y-1">
            {distribution.map((d) => {
              const counts = d.counts as Record<string, number>
              const total = Object.values(counts).reduce((a: number, b: number) => a + (b as number), 0) || 1
              return (
                <div key={d.day} className="flex items-center gap-2">
                  <div className="w-24 shrink-0 text-xs text-white/60">{new Date(d.day).toISOString().slice(0,10)}</div>
                  <div className="h-3 flex w-full rounded bg-white/10 overflow-hidden">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((t) => {
                      const v = counts[String(t)] || 0
                      const pct = (v / total) * 100
                      return <div key={t} className={`tier-${t}`} style={{ width: `${pct}%` }} />
                    })}
                  </div>
                </div>
              )
            })}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
              {Array.from({ length: 8 }, (_, i) => i + 1).map(t => (
                <div key={t} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded tier-${t}`}></span>{t}階</div>
              ))}
            </div>
          </div>
        </div>
      </Section>
      <Section title="ユーザー検索 / 絞り込み">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input className="input" placeholder="email/handle を含む" value={userQuery} onChange={e=>setUserQuery(e.target.value)} />
          <button className="btn" onClick={searchUsers}>検索</button>
        </div>
        <div className="mt-2 max-h-60 overflow-auto rounded border border-white/10 text-sm">
          {userResults.map(u => (
            <div key={u.id} className="flex items-center justify-between border-b border-white/10 px-2 py-1">
              <div>
                <div className="font-mono">{u.email || u.handle || u.id}</div>
                <div className="text-xs text-white/50">{u.id} / tier: {u.tierId ?? '-'}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={() => pickUser(u.id)}>強制変更にセット</button>
                <button className="btn" onClick={() => setFilterUserId(u.id)}>変動履歴フィルタにセット</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="監査ログ（最近）">
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-5">
          <input className="input" placeholder="action" value={auditAction} onChange={e=>setAuditAction(e.target.value)} />
          <select className="input" value={auditRole} onChange={e=>setAuditRole(e.target.value)}>
            <option value="">role (all)</option>
            <option value="admin">admin</option>
            <option value="user">user</option>
            <option value="system">system</option>
          </select>
          <input className="input" placeholder="target contains" value={auditTarget} onChange={e=>setAuditTarget(e.target.value)} />
          <input className="input" type="datetime-local" value={auditFrom} onChange={e=>setAuditFrom(e.target.value)} />
          <input className="input" type="datetime-local" value={auditTo} onChange={e=>setAuditTo(e.target.value)} />
        </div>
        <div className="mb-2"><button className="btn" onClick={loadAuditFiltered}>絞り込む</button></div>
        <div className="max-h-80 overflow-auto rounded border border-white/10 p-2 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="border-b border-white/10 py-2">
              <div className="flex items-center justify-between">
                <div><code>{a.createdAt}</code> [{a.actorRole}] {a.action} {a.target ? `target=${a.target}` : ''}</div>
                <button className="btn" onClick={() => setExpandedAuditId(expandedAuditId === a.id ? '' : a.id)}>{expandedAuditId === a.id ? '閉じる' : '詳細'}</button>
              </div>
              {expandedAuditId === a.id && (
                <pre className="mt-2 rounded bg-black/40 p-2 text-xs">{JSON.stringify(a.payload ?? {}, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </Section>
      <Section title="Tier変動（最近）">
        <div className="mb-2 flex items-center gap-2">
          <input className="input" placeholder="userIdで絞り込み" value={filterUserId} onChange={e=>setFilterUserId(e.target.value)} />
          <button className="btn" onClick={loadTransitionsFiltered}>読込</button>
        </div>
        <div className="max-h-60 overflow-auto rounded border border-white/10 p-2 text-sm">
          {transitions.map((t) => (
            <div key={t.id} className="border-b border-white/10 py-1"><code>{t.decidedAt}</code> {t.userEmail || t.userId}: {t.from} → {t.to} ({t.reason})</div>
          ))}
        </div>
      </Section>
      <Section title="階層強制変更">
        <div className="space-y-2">
          <input className="input" placeholder="userId" value={userId} onChange={e=>setUserId(e.target.value)} />
          <div className="flex items-center gap-2">
            <input className="input w-24" type="number" value={tierId} onChange={e=>setTierId(Number(e.target.value))} min={1} max={8} />
            <input className="input w-32" type="number" value={lockDays} onChange={e=>setLockDays(Number(e.target.value))} min={0} placeholder="lockDays" />
            <button className="btn" onClick={forceTier}>変更</button>
          </div>
        </div>
      </Section>
      <Section title="イベント発火">
        <div className="flex items-center gap-2">
          <select className="input w-48" value={eventKind} onChange={e=>setEventKind(e.target.value as any)}>
            <option value="revolution">大革命</option>
            <option value="gekokujo">下克上</option>
            <option value="custom">custom</option>
          </select>
          <button className="btn" onClick={triggerEvent}>発火</button>
        </div>
      </Section>
      <Section title="ルール編集（Tier）">
        <div className="space-y-2">
          <div>
            <label className="mr-2">Tier:</label>
            <select className="input w-32 inline-block" value={editTierId} onChange={e=>onPickTier(Number(e.target.value))}>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.id}: {t.name}</option>)}
            </select>
          </div>
          <input className="input" placeholder="name" value={editName} onChange={e=>setEditName(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm">obligationsSchema</div>
              <textarea className="textarea" value={editObl} onChange={e=>setEditObl(e.target.value)} rows={12} />
            </div>
            <div>
              <div className="mb-1 text-sm">perksSchema</div>
              <textarea className="textarea" value={editPerks} onChange={e=>setEditPerks(e.target.value)} rows={12} />
            </div>
          </div>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={bumpVersion} onChange={e=>setBumpVersion(e.target.checked)} /> ルールバージョンを+1し、即時適用</label>
          <button className="btn" onClick={saveTier}>保存</button>
        </div>
      </Section>
      <Section title="一括操作（CSV）">
        <div className="text-sm text-white/70">フォーマット: <code>userId,tierId,lockDays</code> （1行1ユーザー）</div>
        <textarea className="textarea mt-2" value={bulkCsv} onChange={e=>setBulkCsv(e.target.value)} rows={8} />
        <button className="btn mt-2" onClick={runBulk}>一括Tier変更を実行</button>
      </Section>
      <Section title="イベントスケジュール">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <select className="input w-48" value={schedKind} onChange={e=>setSchedKind(e.target.value as any)}>
            <option value="revolution">大革命</option>
            <option value="gekokujo">下克上</option>
            <option value="custom">custom</option>
          </select>
          <input className="input" type="datetime-local" value={schedFrom} onChange={e=>setSchedFrom(e.target.value)} />
          <input className="input" type="datetime-local" value={schedTo} onChange={e=>setSchedTo(e.target.value)} />
          <button className="btn" onClick={scheduleEvent}>登録</button>
        </div>
      </Section>
      {msg && <p className="mt-4 text-sm text-white/80">{msg}</p>}
    </main>
  )
}
