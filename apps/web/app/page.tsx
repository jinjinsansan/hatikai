'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Hamburger from '../components/Hamburger'

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } })
  }

  return (
    <main className="relative flex min-h-[70vh] flex-col items-center justify-center">
      {loggedIn && <Hamburger />}
      <div className="hero-8 text-6xl md:text-7xl font-extrabold tracking-[0.25em] bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(99,102,241,0.35)]">８階</div>
      {!loggedIn && (
        <button onClick={signIn} className="btn-google mt-8 inline-flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.024C9.5,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.09,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Googleでログイン
        </button>
      )}
    </main>
  )
}
