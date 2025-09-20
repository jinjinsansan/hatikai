import { ImageResponse } from 'next/server'

export const runtime = 'edge'

function format(text: string, max = 60) {
  const t = text.length > max ? text.slice(0, max - 1) + '…' : text
  return t
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = format(searchParams.get('title') ? decodeURIComponent(searchParams.get('title')!) : 'ハチカイ')
  const image = searchParams.get('image') ? decodeURIComponent(searchParams.get('image')!) : `${new URL(req.url).origin}/icons/icon-512.svg`

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0b0b10, #101322)',
          color: 'white',
          padding: '48px 64px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 24, opacity: 0.8 }}>ハチカイ | 欲しいものルーレット</div>
        </div>
        <div style={{ position: 'relative', width: 360, height: 360, borderRadius: 24, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="item" width={300} height={300} style={{ objectFit: 'contain', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: 999, background: 'linear-gradient(135deg, #22c55e, #6366f1)', opacity: 0.8, bottom: -20, right: -20, filter: 'blur(12px)' }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

