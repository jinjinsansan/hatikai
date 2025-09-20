import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const needsAdmin = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')
  if (!needsAdmin) return NextResponse.next()
  // allow login page and login API without cookie
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/login')) return NextResponse.next()
  const authed = req.cookies.get('admin_authed')?.value === '1'
  if (!authed) {
    if (pathname.startsWith('/api/')) return new NextResponse(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}

