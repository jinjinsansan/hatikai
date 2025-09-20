"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import Section from '@/components/Section'
import { supabase } from '@/lib/supabaseClient'

function ImageWheel({ images, rotation, spinning, durationMs, selectedIdx }: { images: { id: string; src: string; alt: string }[]; rotation: number; spinning: boolean; durationMs: number; selectedIdx: number | null }) {
  const count = Math.max(images.length, 1)
  const step = 360 / count
  return (
    <div className="relative">
      <div className={`relative h-56 w-56 md:h-72 md:w-72 rounded-full border-4 border-white/20 shadow-inner ${spinning ? 'spin-slow' : ''}`} style={!spinning ? { transform: `rotate(${rotation}deg)`, transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)` } : undefined}>
        {images.map((it, i) => {
          const ang = i * step
          return (
            <img key={it.id} src={it.src} alt={it.alt} className={`absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded object-contain md:h-14 md:w-14 ${selectedIdx===i ? 'img-ring-selected' : 'img-ring'} bg-white/5`}
              style={{ transform: `rotate(${ang}deg) translate(${(count>10? 135: count>6? 125: 110)}px) rotate(${-ang}deg)` }} />
          )
        })}
      </div>
      {/* pointer */}
      <div className={`absolute left-1/2 top-[-10px] -translate-x-1/2`}>
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-b-[18px] border-l-transparent border-r-transparent border-b-white" />
      </div>
      {/* center medal */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full medal opacity-80 shadow-lg md:h-20 md:w-20" />
    </div>
  )
}

export default function RoulettePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [resultIdx, setResultIdx] = useState<number | null>(null)
  const [msg, setMsg] = useState<string>('')
  const [rotation, setRotation] = useState<number>(0)
  const [flash, setFlash] = useState<boolean>(false)
  const [medalWin, setMedalWin] = useState<boolean>(false)
  const baseRot = useRef(0)
  const [items, setItems] = useState<any[]>([])
  const [displayItems, setDisplayItems] = useState<any[]>([])
  const [durationMs, setDurationMs] = useState<number>(1800)
  const [ready, setReady] = useState<boolean>(false)
  const [tierId, setTierId] = useState<number | null>(null)
  const [wins, setWins] = useState<any[]>([])
  const rafRef = useRef<number | null>(null)
  const angRef = useRef<number>(0)
  const velRef = useRef<number>(0) // deg/s
  const decelRef = useRef<number>(0) // deg/s^2
  const targetThetaRef = useRef<number>(0) // remaining angle to stop
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAccessToken(s?.access_token ?? null))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const refreshWins = async () => {
    if (!accessToken) return
    const res = await fetch('/api/me/roulette/wins', { headers: { authorization: `Bearer ${accessToken}` } })
    if (res.ok) setWins(await res.json())
  }

  useEffect(() => {
    const load = async () => {
      if (!accessToken) return
      const res = await fetch('/api/me/wish-items', { headers: { authorization: `Bearer ${accessToken}` } })
      if (res.ok) {
        const list = await res.json()
        setItems(list)
      }
      const ts = await fetch('/api/me/tier-state', { headers: { authorization: `Bearer ${accessToken}` } })
      if (ts.ok) { const t = await ts.json(); setTierId(t?.tier?.id ?? null) }
      await refreshWins()
    }
    load()
  }, [accessToken])

  useEffect(() => {
    // Repeat items to ensure enough density
    const minSlots = 12
    if (!items || items.length === 0) { setDisplayItems([]); return }
    // Compute effective weights: base weight * recencyBoost * tierBoost
    const now = Date.now()
    const eff = items.map((it: any, idx: number) => {
      const created = new Date(it.createdAt).getTime()
      const days = (now - created) / (1000*3600*24)
      const recency = days <= 7 ? 2 : days <= 30 ? 1.5 : 1
      const tierBoost = tierId ? (tierId>=6 ? 1.2 : tierId>=4 ? 1.1 : 1) : 1
      const baseW = Number(it.weight ?? 1) || 1
      return { idx, w: baseW * recency * tierBoost }
    })
    const sumW = eff.reduce((a,b)=>a+b.w,0) || 1
    const targetSlots = Math.max(minSlots, items.length * 2)
    const slots = eff.map(e => Math.max(1, Math.round(e.w / sumW * targetSlots)))
    const arr: any[] = []
    slots.forEach((s, i) => {
      for (let k=0;k<s;k++) {
        const it = items[i]
        arr.push({ id: `${it.id}-${arr.length}`, src: it.imageUrl, alt: it.title, origIndex: i })
      }
    })
    setDisplayItems(arr)
    setReady(true)
  }, [items])

  const loop = (ts: number) => {
    if (lastTsRef.current == null) lastTsRef.current = ts
    const dt = (ts - lastTsRef.current) / 1000 // seconds
    lastTsRef.current = ts
    // update
    if (spinning) {
      angRef.current = (angRef.current + velRef.current * dt) % 360
    } else if (decelRef.current > 0) {
      // deceleration phase
      const v = Math.max(0, velRef.current - decelRef.current * dt)
      const avgV = (velRef.current + v) / 2
      const dAng = avgV * dt
      targetThetaRef.current = Math.max(0, targetThetaRef.current - dAng)
      angRef.current = (angRef.current + dAng) % 360
      velRef.current = v
      if (v <= 0 || targetThetaRef.current <= 0.2) {
        // snap
        decelRef.current = 0
        velRef.current = 0
      }
    }
    setRotation(angRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  const startSpin = () => {
    if (!accessToken || spinning) return
    if (!displayItems.length) { setMsg('欲しいものリストにアイテムを追加してください'); return }
    setMsg('')
    setResultIdx(null)
    setSpinning(true)
    // set a base velocity (deg/s)
    velRef.current = 360 // one rotation per second
    lastTsRef.current = null
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop)
  }

  const stopSpin = () => {
    if (!spinning) return
    const idx = Math.floor(Math.random() * displayItems.length)
    setResultIdx(idx)
    const count = displayItems.length
    const step = 360 / count
    // Image at index idx should go to top (pointer) which is -90deg baseline. Our ring rotates, so compute center angle similar to wheel.
    const centerDeg = -90 + step/2 + (idx) * step
    const centerNorm = ((centerDeg % 360) + 360) % 360
    // stop: compute inertia deceleration to reach target
    setSpinning(false)
    const current = ((angRef.current % 360) + 360) % 360
    const theta = ( (360 - centerNorm - current) % 360 ) + (360 * (4 + Math.floor(Math.random()*3)))
    targetThetaRef.current = theta
    // v0^2 = 2 a theta => a = v0^2 / (2 theta)
    const v0 = Math.max(180, velRef.current) // ensure minimum speed
    const a = v0 * v0 / (2 * theta)
    decelRef.current = a
    velRef.current = v0
    // schedule finish indicator
    setTimeout(async () => {
      setFlash(true)
      try { (navigator as any).vibrate?.(50) } catch {}
      setTimeout(() => setFlash(false), 900)
      setMedalWin(true)
      setTimeout(()=> setMedalWin(false), 900)
      baseRot.current = ((angRef.current % 360)+360)%360
      // persist win
      const item = items[displayItems[idx].origIndex]
      try { await fetch('/api/me/roulette/wins', { method:'POST', headers: { 'content-type':'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ itemId: item.id, title: item.title, imageUrl: item.imageUrl, productUrl: item.productUrl }) }) } catch {}
    }, Math.max(1500, (v0/a)*500))
  }

  const stopSpinToIndex = (idx: number) => {
    if (!spinning) setSpinning(true)
    // brief start
    velRef.current = 360
    setTimeout(()=>{
      const count = displayItems.length
      const step = 360 / count
      const centerNorm = ((-90 + step/2 + idx * step) % 360 + 360) % 360
      setSpinning(false)
      const current = ((angRef.current % 360) + 360) % 360
      const theta = ( (360 - centerNorm - current) % 360 ) + (360 * 3)
      targetThetaRef.current = theta
      const v0 = Math.max(180, velRef.current)
      const a = v0 * v0 / (2 * theta)
      decelRef.current = a
      velRef.current = v0
    }, 150)
  }

  return (
    <main>
      <h1 className="text-2xl font-bold">ルーレット</h1>
      <Section title="演出">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <div className={spinning ? 'pointer-wiggle' : ''}>
            <ImageWheel images={displayItems.map(d=>({ ...d, src: `/api/img-proxy?url=${encodeURIComponent(d.src)}` }))} rotation={rotation} spinning={spinning} durationMs={durationMs} selectedIdx={resultIdx} />
            <div className={`pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full medal opacity-80 shadow-lg md:h-20 md:w-20 ${medalWin ? 'medal-win' : ''}`} />
            {!ready && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/50 px-3 py-2 text-sm">読み込み中...</div>
            )}
          </div>
          <div className="space-y-2 w-full md:w-auto">
            <div className="flex gap-2">
              <button className="btn btn-primary w-full md:w-auto" onClick={startSpin} disabled={!accessToken || spinning || !ready}>スタート</button>
              <button className="btn w-full md:w-auto" onClick={stopSpin} disabled={!spinning}>ストップ</button>
            </div>
            {resultIdx!=null && displayItems[resultIdx] && items[displayItems[resultIdx].origIndex] && (
              <div className="text-sm" aria-live="polite">
                <div className="mt-2 flex items-center gap-3">
                  <img src={items[displayItems[resultIdx].origIndex].imageUrl} alt={items[displayItems[resultIdx].origIndex].title} className="h-12 w-12 rounded object-contain" />
                  <div>
                    <div className="font-medium">{items[displayItems[resultIdx].origIndex].title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <a className="btn" href={items[displayItems[resultIdx].origIndex].productUrl} target="_blank" rel="noopener noreferrer"
                        onClick={async (e)=>{
                          e.preventDefault()
                          await fetch(`/api/me/wish-items/${items[displayItems[resultIdx].origIndex].id}/click`, { method:'POST', headers: { authorization: `Bearer ${accessToken}` } })
                          window.open(items[displayItems[resultIdx].origIndex].productUrl, '_blank', 'noopener,noreferrer')
                        }}
                      >Amazonで見る</a>
                      <button className="btn" onClick={async ()=>{
                        try { await navigator.clipboard.writeText(`${items[displayItems[resultIdx].origIndex].title}\n${items[displayItems[resultIdx].origIndex].productUrl}`) } catch {}
                      }}>コピー</button>
                      <button className="btn" onClick={async ()=>{
                        const url = items[displayItems[resultIdx].origIndex].productUrl
                        const text = `これ欲しい！ ${items[displayItems[resultIdx].origIndex].title}`
                        if ((navigator as any).share) { try { await (navigator as any).share({ title: 'ハチカイ', text, url }) } catch {} }
                        else { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank') }
                      }}>共有</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {msg && <p className="text-sm text-red-300">{msg}</p>}
            <p className="text-sm text-white/70">※ 画像はあなたの欲しいものリストから。外部サイト（Amazon）へのリンクは新しいタブで開きます。</p>
          </div>
        </div>
      </Section>
      <Section title="使い方">
        <ol className="list-decimal pl-5 text-sm text-white/70">
          <li>「欲しいもの」ページでAmazon商品のURLと画像URLを登録</li>
          <li>このページでスタート→画像が回転→ストップで候補が停止</li>
          <li>「Amazonで見る」で商品ページを開く（外部サイト）</li>
        </ol>
      </Section>
      <Section title="当選履歴（最近）">
        {wins.length ? (
          <ul className="divide-y divide-white/10 text-sm">
            {wins.map(w => (
              <li key={w.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <img src={`/api/img-proxy?url=${encodeURIComponent(w.imageUrl)}`} alt={w.title} className="h-10 w-10 rounded object-contain" />
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-white/60">{new Date(w.decidedAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a className="btn" href={w.productUrl} target="_blank" rel="noopener noreferrer">Amazon</a>
                  <button className="btn" onClick={()=>{
                    // replay: find any display index for this item
                    const idx = displayItems.findIndex(d => items[d.origIndex]?.id === w.itemId)
                    if (idx>=0) {
                      if (!spinning) startSpin()
                      setTimeout(()=>{ stopSpinToIndex(idx) }, 200)
                    }
                  }}>リプレイ</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-white/60">まだ当選履歴がありません</div>}
      </Section>
    </main>
  )
}
