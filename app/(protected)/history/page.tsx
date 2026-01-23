import { cookies } from 'next/headers'
import { createClient } from '../../../utils/supabase/server'
import Link from 'next/link'
import type { Prediction } from '../../../types'

export default async function HistoryPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-emerald-800">Riwayat Prediksi</h2>
          <p className="text-neutral-700">Anda belum masuk. Silakan masuk untuk melihat riwayat prediksi Anda.</p>
          <div className="mt-4">
            <Link href="/login" className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Masuk</Link>
          </div>
        </div>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('id,label,confidence,source,occurred_at')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })

  const { data: ratingRows, error: ratingErr } = await supabase
    .from('product_ratings')
    .select('product_id,brand,product_name,tag,rating,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">Gagal memuat riwayat: {error.message}</div>
      </main>
    )
  }

  const rows = (data ?? []) as Prediction[]

  type RatingRow = {
    product_id: number
    brand: string | null
    product_name: string | null
    tag: string | null
    rating: number
    updated_at: string
  }

  const ratings = ((ratingRows ?? []) as RatingRow[]).filter((r) => r && typeof r.rating === 'number')
  const brands = Array.from(
    new Map(
      ratings
        .map((r) => String(r.brand || '').trim())
        .filter(Boolean)
        .map((b) => [b.toLowerCase(), b] as const)
    ).values()
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">Riwayat Prediksi</h1>
        <p className="mt-1 text-neutral-600">Jejak analisis kulit Anda, lengkap dengan tingkat keyakinan dan sumber gambar.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-emerald-900">Rating Produk Anda</h2>
        <p className="mt-1 text-sm text-neutral-600">Brand yang Anda rating akan dipakai untuk menyortir rekomendasi pada halaman prediksi.</p>

        {ratingErr ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Gagal memuat rating produk: {ratingErr.message}
            <div className="mt-2 text-sm text-amber-700">Jika baru pertama kali menambahkan fitur rating, jalankan SQL migrasi di Supabase: <span className="font-mono">supabase/migrations/20260124_product_ratings.sql</span></div>
          </div>
        ) : ratings.length === 0 ? (
          <div className="mt-4 text-sm text-neutral-700">Belum ada rating. Beri rating di halaman <Link href="/predict" className="text-emerald-700 underline">Prediksi</Link> agar rekomendasi makin personal.</div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {brands.map((b) => (
                <span key={b} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ratings.slice(0, 8).map((r) => (
                <div key={`${r.product_id}-${r.updated_at}`} className="rounded-xl border border-emerald-100 bg-white p-4">
                  <div className="text-sm text-neutral-500">{r.brand ?? 'Unknown brand'}</div>
                  <div className="font-semibold text-neutral-900">{r.product_name ?? `Produk #${r.product_id}`}</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Rating</span>
                    <span className="font-semibold text-emerald-700">{r.rating}/5</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{r.tag ? `Tag: ${r.tag}` : null}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 text-center text-neutral-700 shadow-sm">Belum ada riwayat. Lakukan prediksi pertama Anda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const confidencePct = Math.round(row.confidence * 100)
            return (
              <div key={row.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-neutral-500">Label</div>
                    <div className="text-lg font-semibold text-neutral-900">{row.label}</div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-700">{row.source}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Tingkat Keyakinan</span>
                    <span className="font-medium text-emerald-700">{confidencePct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-emerald-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }} />
                  </div>
                </div>
                <div className="mt-4 text-xs text-neutral-500">{new Date(row.occurred_at).toLocaleString()}</div>
                <div className="mt-4">
                  <Link href="/predict" className="inline-block rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50">Ulangi Prediksi</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
