import './globals.css'
import AppInit from '../components/AppInit'
export const metadata = { title: 'ハチカイ', description: '階層×ルーレット MVP' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0b10" />
        <link rel="icon" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <AppInit />
          {children}
        </div>
      </body>
    </html>
  )
}
