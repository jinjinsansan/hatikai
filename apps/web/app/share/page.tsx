import type { Metadata } from 'next'

export const dynamic = 'force-static'

export async function generateMetadata({ searchParams }: { searchParams: { title?: string; image?: string; url?: string } }): Promise<Metadata> {
  const title = searchParams.title ? decodeURIComponent(searchParams.title) : 'ハチカイ'
  const image = searchParams.image ? decodeURIComponent(searchParams.image) : '/icons/icon-512.svg'
  const url = searchParams.url ? decodeURIComponent(searchParams.url) : undefined
  return {
    title,
    description: '欲しいものシェア',
    openGraph: {
      title,
      description: 'ハチカイ 欲しいものシェア',
      images: [{ url: image }],
      url
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'ハチカイ 欲しいものシェア',
      images: [image]
    }
  }
}

export default function SharePage({ searchParams }: { searchParams: { title?: string; image?: string; url?: string } }) {
  const title = searchParams.title ? decodeURIComponent(searchParams.title) : 'ハチカイ'
  const image = searchParams.image ? decodeURIComponent(searchParams.image) : '/icons/icon-512.svg'
  const url = searchParams.url ? decodeURIComponent(searchParams.url) : '/'
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-xl text-center">
        <img src={image} alt={title} className="mx-auto h-48 w-48 rounded object-contain" />
        <h1 className="mt-3 text-xl font-bold">{title}</h1>
        <a className="btn mt-3" href={url} target="_blank" rel="noopener noreferrer">Amazonで見る</a>
      </div>
    </main>
  )
}

