import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { requireEnv } from '@/lib/env.server'

function extractDirectUrl(url?: string) {
  const val = String(url || '').trim()
  if (!val) return ''
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

export async function POST() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'),
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
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: adminRow } = await supabase.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

  const { data, error } = await supabase
    .from('articles')
    .select('id, cover_url')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const updates: Array<{ id: number; from: string; to: string }> = []
  for (const row of data || []) {
    const to = extractDirectUrl(row.cover_url)
    if (to && to !== row.cover_url) {
      await supabase.from('articles').update({ cover_url: to }).eq('id', row.id)
      updates.push({ id: row.id, from: row.cover_url, to })
    }
  }

  return NextResponse.json({ ok: true, updated: updates.length, updates })
}
