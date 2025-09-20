"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Hamburger() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setLoggedIn(!!data.session); setEmail(data.session?.user.email ?? null) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setLoggedIn(!!s); setEmail(s?.user?.email ?? null) })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  if (!loggedIn) return null
  return (
    <>
      <button aria-label="menu" onClick={()=>setOpen(true)} className="fixed right-4 top-4 z-40 rounded bg-white/15 px-3 py-2 text-white backdrop-blur hover:bg-white/25 transition">☰</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-white text-black">
          <div className="flex items-center justify-between border-b border-black/10 p-5">
            <div>
              <div className="text-xl font-extrabold tracking-wide">メニュー</div>
              {email && <div className="text-xs text-black/60 mt-1">{email}</div>}
            </div>
            <button onClick={()=>setOpen(false)} className="rounded bg-black px-3 py-1.5 text-white">閉じる</button>
          </div>
          <nav className="px-5 py-4">
            <ul className="space-y-3 text-lg">
              <li><a className="block rounded px-3 py-3 hover:bg-black/5" href="/mypage" onClick={()=>setOpen(false)}>マイページ</a></li>
              <li><a className="block rounded px-3 py-3 hover:bg-black/5" href="/roulette" onClick={()=>setOpen(false)}>Amazon欲しいものリストを購入するルーレット</a></li>
              <li><a className="block rounded px-3 py-3 hover:bg-black/5" href="/floor" onClick={()=>setOpen(false)}>現在の自分の住居階数</a></li>
              <li><a className="block rounded px-3 py-3 hover:bg黒色/5" href="/ads" onClick={()=>setOpen(false)}>広告閲覧</a></li>
              <li><a className="block rounded px-3 py-3 hover:bg-black/5" href="/guide" onClick={()=>setOpen(false)}>使い方</a></li>
              <li>
                <button onClick={async ()=>{ await supabase.auth.signOut(); setOpen(false) }} className="mt-6 w-full rounded bg-black px-4 py-3 text-white">ログアウト</button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
