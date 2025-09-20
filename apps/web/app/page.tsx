'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { tierAPI, obligationAPI, userAPI } from '../lib/api'
import Hamburger from '../components/Hamburger'
import type { UserTier, Obligation, Tier } from '../lib/api'

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<UserTier | null>(null)
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoggedIn(!!s)
      if (s) {
        loadUserData()
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    setLoggedIn(!!data.session)
    if (data.session) {
      // Store token for API calls
      localStorage.setItem('token', data.session.access_token)
      await loadUserData()
    }
    setLoading(false)
  }

  const loadUserData = async () => {
    try {
      // Load tiers first
      const tiersData = await tierAPI.getTiers()
      setTiers(tiersData)

      // Try to get user tier
      try {
        const tierData = await tierAPI.getMyTier()
        setUserTier(tierData)
      } catch (e) {
        // User might not have a tier yet
        console.log('No tier assigned yet')
      }

      // Try to get obligations
      try {
        const obligationsData = await obligationAPI.getMyObligations()
        setObligations(obligationsData)
      } catch (e) {
        console.log('No obligations yet')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    })
  }

  const runInitialRoulette = async () => {
    try {
      setLoading(true)
      const result = await tierAPI.assignInitialTier()
      setUserTier(result)
      await loadUserData() // Reload all data
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tierId: number) => {
    const colors = [
      'bg-gray-800 text-white', // 1: 最下層
      'bg-red-700 text-white',  // 2: 借金階層
      'bg-orange-600 text-white', // 3: 条件付き平等
      'bg-yellow-500 text-black', // 4: 選択の自由
      'bg-green-500 text-white', // 5: 優遇開始
      'bg-blue-500 text-white',  // 6: 投資家気分
      'bg-purple-600 text-white', // 7: ほぼ特権階級
      'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' // 8: 最上階
    ]
    return colors[tierId - 1] || 'bg-gray-400'
  }

  const getTierDisplayName = (tierId: number) => {
    const names = [
      '最下層', '借金階層', '条件付き平等', '選択の自由',
      '優遇開始', '投資家気分', 'ほぼ特権階級', '最上階'
    ]
    return names[tierId - 1] || '不明'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {loggedIn && <Hamburger />}

      {!loggedIn ? (
        // Login screen - White background with stylish 8F
        <div className="flex min-h-screen flex-col items-center justify-center bg-white">
          <div className="text-[20rem] md:text-[25rem] lg:text-[30rem] font-black text-black leading-none select-none"
               style={{
                 fontFamily: 'Playfair Display, serif',
                 letterSpacing: '-0.1em'
               }}>
            8F
          </div>
          <button onClick={signIn} className="mt-16 px-8 py-4 bg-black text-white font-bold text-lg rounded-full hover:bg-gray-800 transition-all duration-300 transform hover:scale-105">
            ENTER
          </button>
        </div>
      ) : (
        // Dashboard
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              ハチカイ・ダッシュボード
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Current Tier Display */}
          {!userTier ? (
            <div className="mb-8 p-8 bg-white rounded-xl shadow-lg text-center">
              <h2 className="text-2xl font-bold mb-4">ようこそ！</h2>
              <p className="text-gray-600 mb-6">
                まだ階層が割り当てられていません。<br />
                ルーレットを回して、あなたの階層を決定しましょう！
              </p>
              <button
                onClick={runInitialRoulette}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                disabled={loading}
              >
                🎰 初回ルーレットを回す
              </button>
            </div>
          ) : (
            <div className="mb-8">
              <div className={`p-8 rounded-xl shadow-lg ${getTierColor(userTier.tierId)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-80 mb-2">現在の階層</p>
                    <h2 className="text-4xl font-bold mb-2">
                      第{userTier.tierId}階 - {getTierDisplayName(userTier.tierId)}
                    </h2>
                    <p className="opacity-90">
                      階層滞在日数: {userTier.daysInTier}日
                    </p>
                    <p className="text-sm opacity-75 mt-2">
                      最終ルーレット: {formatDate(userTier.lastRouletteAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80">総ポイント</p>
                    <p className="text-3xl font-bold">{userTier.totalPoints}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Obligations Section */}
          {userTier && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  📋 本日の義務
                </h3>
                {obligations.filter(o => o.status === 'pending').length > 0 ? (
                  <ul className="space-y-3">
                    {obligations.filter(o => o.status === 'pending').map((obligation) => (
                      <li key={obligation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            obligation.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {obligation.type === 'purchase' ? '購入' : '広告視聴'}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            期限: {formatDate(obligation.dueDate)}
                          </p>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-800">
                          完了する →
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">今日の義務はありません</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  📊 完了済み
                </h3>
                {obligations.filter(o => o.status === 'completed').length > 0 ? (
                  <ul className="space-y-3">
                    {obligations.filter(o => o.status === 'completed').slice(0, 5).map((obligation) => (
                      <li key={obligation.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            obligation.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {obligation.type === 'purchase' ? '購入' : '広告視聴'}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            完了: {obligation.completedAt && formatDate(obligation.completedAt)}
                          </p>
                        </div>
                        <span className="text-green-600">✓</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">完了済みの義務はまだありません</p>
                )}
              </div>
            </div>
          )}

          {/* Tier List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">🏢 階層一覧</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`p-4 rounded-lg text-center ${
                    userTier?.tierId === tier.id
                      ? `${getTierColor(tier.id)} ring-4 ring-offset-2 ring-indigo-400`
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <p className="font-bold text-lg">第{tier.id}階</p>
                  <p className="text-sm mt-1">{getTierDisplayName(tier.id)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}