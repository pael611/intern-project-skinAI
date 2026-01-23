import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'

const postSchema = z.object({
  productId: z.union([z.string().min(1), z.number().int().positive()]),
  rating: z.number().int().min(1).max(5),
  brand: z.string().trim().min(1).optional(),
  productName: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  predictionId: z.string().uuid().optional(),
})

type RatingRow = {
  product_id: number
  rating: number
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }

    const url = new URL(req.url)
    const productIdsRaw = url.searchParams.get('productIds')

    let query = supabase
      .from('product_ratings')
      .select('product_id,rating')
      .eq('user_id', user.id)

    if (productIdsRaw) {
      const ids = Array.from(
        new Set(
          productIdsRaw
            .split(',')
            .map((v) => Number(String(v).trim()))
            .filter((n) => Number.isFinite(n) && n > 0)
        )
      ).slice(0, 200)

      if (ids.length > 0) {
        query = query.in('product_id', ids)
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const map: Record<string, number> = {}
    for (const row of (data ?? []) as RatingRow[]) {
      map[String(row.product_id)] = row.rating
    }

    return NextResponse.json({ ok: true, ratings: map }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid payload',
        detail: parsed.error.flatten(),
      }, { status: 400 })
    }

    const { productId, rating, brand, productName, tag, predictionId } = parsed.data
    const product_id = typeof productId === 'number' ? productId : Number(productId)

    if (!Number.isFinite(product_id) || product_id <= 0) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 })
    }

    const payload = {
      user_id: user.id,
      product_id,
      rating,
      brand: brand ?? null,
      product_name: productName ?? null,
      tag: tag ?? null,
      last_prediction_id: predictionId ?? null,
    }

    const { data, error } = await supabase
      .from('product_ratings')
      .upsert(payload, { onConflict: 'user_id,product_id' })
      .select('product_id,rating')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 })
  }
}
