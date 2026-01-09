import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabasePublishableKey) {
      return NextResponse.json({
        error: 'Supabase env missing',
        detail: 'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY are set.',
      }, { status: 500 })
    }
    // Get user from server-side Supabase session via cookies
    const cookieStore = cookies()
    const supabaseServer = createServerClient(supabaseUrl ?? '', supabasePublishableKey ?? '', {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }))
        },
      },
    })

    const body = await req.json()
    const { label, confidence, source, occurred_at } = body as {
      label: string
      confidence: number
      source: 'upload' | 'camera'
      occurred_at?: string
    }
    if (!label || typeof confidence !== 'number' || !source) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data: { user }, error: userErr } = await supabaseServer.auth.getUser()
    if (userErr) {
      console.error('Supabase getUser error:', userErr.message)
    }

    type PredictionInsertPayload = {
      label: string
      confidence: number
      source: 'upload' | 'camera'
      occurred_at: string
      user_id?: string
    }

    const payload: PredictionInsertPayload = {
      label,
      confidence,
      source,
      occurred_at: occurred_at ?? new Date().toISOString(),
    }
    if (!user?.id) {
      return NextResponse.json({
        error: 'Not authenticated',
        hint: 'Login required before saving prediction. Ensure cookies/session present.'
      }, { status: 401 })
    }

    if (user?.id) {
      payload.user_id = user.id
      // Ensure user exists in public.app_users with default role 'user'
        const { error: upsertErr } = await supabaseServer
          .from('app_users')
          .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
      if (upsertErr) {
        console.warn('Upsert app_users warning:', upsertErr.message)
      }
    }

    // Insert using server session client to respect RLS.
    const { data, error } = await supabaseServer.from('predictions').insert(payload).select()
    if (error) {
      const msg = error.message || 'Unknown insert error'
      const looksLikeHtml = typeof msg === 'string' && msg.includes('<html')
      console.error('Predictions insert error:', msg)
      return NextResponse.json({
        error: looksLikeHtml ? 'Upstream error from Supabase (HTML response)' : msg,
        hint: looksLikeHtml ? 'Check Supabase URL/key and network; Cloudflare 5xx may indicate misconfiguration or regional outage.' : undefined,
      }, { status: 500 })
    }
    return NextResponse.json({ ok: true, data: Array.isArray(data) ? data[0] : data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const looksLikeHtml = typeof msg === 'string' && msg.includes('<html')
    console.error('Predictions route exception:', msg)
    return NextResponse.json({
      error: looksLikeHtml ? 'Upstream error from Supabase (HTML response)' : msg,
      hint: looksLikeHtml ? 'Verify env NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY; ensure project reachable.' : undefined,
    }, { status: 500 })
  }
}
