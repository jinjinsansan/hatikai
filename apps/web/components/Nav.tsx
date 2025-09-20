"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'ホーム' },
  { href: '/roulette', label: 'ルーレット' },
  { href: '/tiers', label: '階層' },
  { href: '/wishlist', label: '欲しいもの' },
  { href: '/history', label: '履歴' },
  { href: '/admin', label: '管理' }
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <header className="mb-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">ハチカイ</Link>
      <nav className="flex gap-2 overflow-x-auto no-scrollbar">
        {items.map(i => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded px-3 py-2 text-sm ${pathname === i.href ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
