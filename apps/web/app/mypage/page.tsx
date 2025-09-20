'use client'
import Hamburger from '../../components/Hamburger'

export default function MyPage() {
  return (
    <main className="relative px-4 py-8">
      <Hamburger />
      <h1 className="text-2xl font-bold">マイページ</h1>
      <p className="text-white/70 mt-2">ここに個人設定やお知らせなどを表示します。</p>
    </main>
  )
}

