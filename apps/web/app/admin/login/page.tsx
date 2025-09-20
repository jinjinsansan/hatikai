"use client"
import { useState } from 'react'
import Section from '@/components/Section'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const submit = async () => {
    setMsg('')
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
    const data = await res.json()
    if (res.ok) router.replace('/admin')
    else setMsg(data?.error || 'failed')
  }
  return (
    <main>
      <h1 className="text-2xl font-bold">管理ログイン</h1>
      <Section title="アクセスキーを入力">
        <input className="input w-80" type="password" placeholder="ADMIN_TOKEN" value={token} onChange={e=>setToken(e.target.value)} />
        <div className="mt-2">
          <button className="btn btn-primary" onClick={submit}>ログイン</button>
        </div>
        {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
      </Section>
    </main>
  )
}

