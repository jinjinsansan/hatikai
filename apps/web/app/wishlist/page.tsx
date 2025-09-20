"use client"
import { useEffect, useState } from 'react'
import Section from '../../components/Section'
import { supabase } from '../../lib/supabaseClient'

export default function WishlistPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [ogTried, setOgTried] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAccessToken(s?.access_token ?? null))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const load = async () => {
    if (!accessToken) return
    const res = await fetch('/api/me/wish-items', { headers: { authorization: `Bearer ${accessToken}` } })
    if (res.ok) setItems(await res.json())
  }
  useEffect(() => { load() }, [accessToken])

  const add = async () => {
    setMsg('')
    if (!title || !productUrl || !imageUrl) { setMsg('タイトル/商品URL/画像URLは必須です'); return }
    if (!/amazon\./.test(productUrl)) { setMsg('商品URLはAmazonのドメインである必要があります'); return }
    const res = await fetch('/api/me/wish-items', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ title, productUrl, imageUrl }) })
    const data = await res.json()
    if (res.ok) { setTitle(''); setProductUrl(''); setImageUrl(''); load() }
    else setMsg(data?.error || '保存に失敗しました')
  }
  const autoFetchOg = async () => {
    setMsg('')
    if (!productUrl) { setMsg('商品URLを入力してください'); return }
    const res = await fetch(`/api/og?url=${encodeURIComponent(productUrl)}`)
    const data = await res.json()
    if (res.ok && data?.imageUrl) {
      if (!title && data.title) setTitle(data.title)
      setImageUrl(data.imageUrl)
      setOgTried(true)
    } else {
      setMsg(data?.error || 'OG画像が取得できませんでした（URL/地域によって取得できない場合があります）')
    }
  }
  // Debounce auto-fetch when productUrl changes
  useEffect(() => {
    if (!productUrl || !/amazon\./.test(productUrl)) return
    if (imageUrl) return
    const t = setTimeout(() => { autoFetchOg() }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productUrl])
  const remove = async (id: string) => {
    const res = await fetch(`/api/me/wish-items/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${accessToken}` } })
    if (res.ok) load()
  }

  return (
    <main>
      <h1 className="text-2xl font-bold">欲しいものリスト</h1>
      <Section title="追加">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="input" placeholder="タイトル" value={title} onChange={e=>setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input className="input" placeholder="商品URL（Amazon）" value={productUrl} onChange={e=>setProductUrl(e.target.value)} />
            {!imageUrl && <button className="btn" type="button" onClick={autoFetchOg}>画像自動取得</button>}
          </div>
          <input className="input" placeholder="画像URL（Amazonの商品画像など）" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
          <button className="btn" onClick={add}>追加</button>
        </div>
        {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
        {imageUrl && (
          <div className="mt-3 text-sm text-white/70">
            プレビュー：<br />
            <img src={imageUrl} alt="preview" className="mt-1 max-h-48 rounded border border-white/10" />
          </div>
        )}
      </Section>
      <Section title="登録済み">
        {items.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {items.map(it => (
              <div key={it.id} className="card">
                <img src={`/api/img-proxy?url=${encodeURIComponent(it.imageUrl)}`} alt={it.title} className="h-40 w-full rounded object-contain" />
                <div className="mt-2 text-sm font-medium">{it.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a className="btn" href={it.productUrl} target="_blank" rel="noopener noreferrer">Amazonで見る</a>
                  <button className="btn" onClick={() => remove(it.id)}>削除</button>
                  <div className="ml-auto flex items-center gap-2 text-sm">
                    <span>重み</span>
                    <input className="input w-24" type="number" step="0.1" min={0.1} value={it.weight ?? 1}
                      onChange={e=> setItems(prev => prev.map(p => p.id===it.id ? {...p, weight: Number(e.target.value)} : p))} />
                    <button className="btn" onClick={async ()=>{
                      await fetch(`/api/me/wish-items/${it.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ weight: Number(it.weight)||1 }) })
                    }}>保存</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-white/60">まだ登録がありません</div>}
      </Section>
      <Section title="画像アップロード（将来のCDN最適化）">
        <div className="text-sm text-white/70">S3を設定済みの場合、ローカル画像をアップロードし、画像URLを自動入力できます。</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="file" className="input" accept="image/*" onChange={e=> setFile(e.target.files?.[0] || null)} />
          <button className="btn" onClick={async ()=>{
            setMsg('')
            if (!file) { setMsg('画像ファイルを選択してください'); return }
            const sign = await fetch('/api/uploads/s3-sign', { method:'POST', headers:{ 'content-type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type }) })
            const sdata = await sign.json()
            if (!sign.ok || sdata?.error) { setMsg('署名エラー: AWS設定と依存パッケージの導入が必要です'); return }
            const put = await fetch(sdata.uploadUrl, { method:'PUT', headers: { 'content-type': file.type }, body: file })
            if (!put.ok) { setMsg('アップロードに失敗しました'); return }
            setImageUrl(sdata.publicUrl)
          }}>アップロードしてURLに反映</button>
        </div>
      </Section>
    </main>
  )
}
