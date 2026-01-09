import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '../../../../utils/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    const admin = serviceRole ? createAdmin(supabaseUrl, serviceRole) : null

    // Upsert into app_users table (id references auth.users.id), default role 'user'
    if (!admin) return NextResponse.json({ ok: true, skipped: true })

    const { error } = await admin.from('app_users').upsert({
      id: user.id,
      email: user.email,
      role: 'user',
    }, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Unknown error' }, { status: 500 })
  }
}
