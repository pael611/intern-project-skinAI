import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Validation schema dengan strict rules
const ratingSchema = z.object({
  product_id: z.string().min(1).max(255),
  product_name: z.string().max(255).optional(),
  brand: z.string().max(255).optional(),
  tag: z.string().max(100).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional(),
})

type RatingInput = z.infer<typeof ratingSchema>

/**
 * Helper untuk init Supabase client
 * TC: O(1), SC: O(1)
 */
function initSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase environment variables missing')
  }

  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options }))
      },
    },
  })
}

/**
 * POST /api/ratings - Submit product rating
 * TC: O(1), SC: O(1)
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseServer = initSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: userErr } = await supabaseServer.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse dan validasi request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ratingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', detail: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { product_id, product_name, brand, tag, rating, comment } = parsed.data

    // Insert rating ke database
    const { data, error } = await supabaseServer
      .from('product_ratings')
      .insert({
        user_id: user.id,
        product_id,
        product_name: product_name || null,
        brand: brand || null,
        tag: tag || null,
        rating,
        comment: comment || null,
      })
      .select()

    if (error) {
      console.error('Rating insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: data?.[0] || null,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('POST /api/ratings error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/ratings - Fetch rating statistics
 * TC: O(n) dimana n = total ratings untuk product
 * SC: O(n)
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseServer = initSupabaseClient()

    const url = new URL(req.url)
    const productId = url.searchParams.get('product_id')

    // Validate product_id parameter
    if (!productId || productId.trim().length === 0) {
      return NextResponse.json(
        { error: 'product_id parameter is required' },
        { status: 400 }
      )
    }

    // Fetch ratings dengan count exact
    const { data, error, count } = await supabaseServer
      .from('product_ratings')
      .select('rating', { count: 'exact' })
      .eq('product_id', productId)

    if (error) {
      console.error('Rating fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ratings = (data || []) as Array<{ rating: number }>
    const totalRatings = count || 0

    // Calculate average dengan fallback
    const averageRating =
      totalRatings > 0
        ? Number(
            (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
          )
        : 0

    // Add cache headers untuk optimization
    return NextResponse.json(
      {
        ok: true,
        data: {
          product_id: productId,
          total_ratings: totalRatings,
          average_rating: averageRating,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('GET /api/ratings error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
