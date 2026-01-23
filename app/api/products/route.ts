import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'

const querySchema = z.object({
  label: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const parsed = querySchema.safeParse({
      label: url.searchParams.get('label') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', detail: parsed.error.flatten() }, { status: 400 })
    }

    const { label, limit } = parsed.data

    const supabase = createClient(cookies())

    let query = supabase
      .from('product')
      .select('id_product,nama_product,label,brand,harga,gambar,link,created_at')
      .order('created_at', { ascending: false })
      .limit(limit ?? 200)

    if (label) {
      query = query.eq('label', label)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cache: public product catalog can be cached briefly.
    return NextResponse.json(
      { ok: true, data: data ?? [] },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 })
  }
}
