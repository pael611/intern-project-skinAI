import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  const envOk = Boolean(supabaseUrl && supabasePublishableKey)
  if (!envOk) {
    return NextResponse.json({
      ok: false,
      envOk,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    }, { status: 500 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }))
      },
    },
  })

  const { data: { user }, error: userErr } = await supabase.auth.getUser()

  // Lightweight connectivity check: attempt a minimal query
  let canQuery = false
  let queryErrMsg: string | undefined
  try {
    const { error: qErr } = await supabase
      .from('app_users')
      .select('id')
      .limit(1)
    if (!qErr) canQuery = true
    else queryErrMsg = qErr.message
  } catch (e: unknown) {
    queryErrMsg = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    ok: envOk && !userErr,
    envOk,
    session: user ? { id: user.id, email: user.email } : null,
    userError: userErr ? userErr.message : null,
    canQuery,
    queryError: queryErrMsg ?? null,
  })
}
