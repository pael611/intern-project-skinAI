import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { z } from 'zod'
import { requireEnv, requireEnvAny } from '@/lib/env.server'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnvAny(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }))
        },
      },
    }
  )
  const { data, error } = await supabase
    .from('articles')
    .select('id,title,summary,cover_url,created_at,source')
    .order('created_at', { ascending: false })
    .limit(24)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnvAny(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY']),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Verify admin: check presence in admin_users table
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .single()
  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }

  const schema = z.object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    content_url: z.string().optional(),
    cover_url: z.string().optional(),
    source: z.enum(['koran', 'bacaan']).optional(),
  })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 })
  }

  const { title, summary, content_url, cover_url, source } = parsed.data

  const sanitizeUrl = (url?: string) => {
    const val = String(url || '').trim()
    if (!val) return val
    try {
      const u = new URL(val)
      if (u.hostname === 'www.google.com' && u.pathname === '/url' && u.searchParams.get('q')) {
        return u.searchParams.get('q') as string
      }
      return val
    } catch {
      return val
    }
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({ title, summary, content_url: sanitizeUrl(content_url), cover_url: sanitizeUrl(cover_url), source })
    .select()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: Array.isArray(data) ? data[0] : data })
}
