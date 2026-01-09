import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: ['/profile', '/history', '/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  const protectedPaths = ['/profile', '/history']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  if (!isProtected) return res

  type CookieSetOptions = Omit<Parameters<typeof res.cookies.set>[0], 'name' | 'value'>

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieSetOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieSetOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const url = new URL('/login', req.url)
    const next = req.nextUrl.pathname + (req.nextUrl.search ?? '')
    url.searchParams.set('redirect', next)
    return NextResponse.redirect(url)
  }

  return res
}
