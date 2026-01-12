import { NextResponse, type NextRequest } from 'next/server'

export const config = {
  matcher: ['/profile', '/history', '/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const protectedPaths = ['/profile', '/history', '/admin']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  try {
    const authUrl = new URL('/api/auth/user', req.url)
    const cookieHeader = req.headers.get('cookie') ?? ''
    const authRes = await fetch(authUrl, {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: 'no-store',
    })

    if (authRes.ok) {
      const data = (await authRes.json().catch(() => null)) as { user?: { id?: string } | null } | null
      if (data?.user?.id) return NextResponse.next()
    }

    if (authRes.status === 401) {
      const url = new URL('/login', req.url)
      const next = req.nextUrl.pathname + (req.nextUrl.search ?? '')
      url.searchParams.set('redirect', next)
      return NextResponse.redirect(url)
    }

    const detail = await authRes.text().catch(() => '')
    return NextResponse.json({ ok: false, error: 'Auth check failed', detail }, { status: 500 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: 'Auth check exception', detail: message }, { status: 500 })
  }
}
