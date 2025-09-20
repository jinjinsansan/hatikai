'use client'
import Hamburger from '../../components/Hamburger'

export default function GuidePage() {
  return (
    <main className="relative px-4 py-8">
      <Hamburger />
      <h1 className="text-2xl font-bold">使い方</h1>
      <ol className="mt-3 list-decimal pl-5 text-white/80">
        <li>トップでGoogleログイン</li>
        <li>ハンバーガーメニューから各ページへ移動</li>
        <li>欲しいものを登録して、ルーレットで選ぶ</li>
      </ol>
    </main>
  )
}

