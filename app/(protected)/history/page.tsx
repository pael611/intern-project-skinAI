import { cookies } from 'next/headers'
import { createClient } from '../../../utils/supabase/server'
import Link from 'next/link'
import type { Prediction } from '../../../types'
import { PAGINATION } from '../../../lib/constants'
import { formatDate, getConfidencePercentage } from '../../../lib/utils'

/**
 * HistoryPage - Server Component
 * TC: O(n) dimana n = perPage
 * SC: O(n) untuk storing data
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
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

  // Parse pagination parameters dengan validasi
  const pageRaw = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page
  const page = Math.max(1, Number(pageRaw ?? 1) || 1)
  const perPage = PAGINATION.HISTORY_PER_PAGE
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Fetch dengan select columns yang spesifik untuk optimasi
  const { data, error, count } = await supabase
    .from('predictions')
    .select('id,label,confidence,source,occurred_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .range(from, to)

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Gagal memuat riwayat: {error.message}
        </div>
      </main>
    )
  }

  const rows = (data ?? []) as Prediction[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-emerald-900">Riwayat Prediksi</h1>
          <p className="mt-1 text-sm text-neutral-600">{total} total prediksi</p>
        </div>
        <Link href="/predict" className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 text-sm font-medium">
          + Prediksi Baru
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
          <p className="text-neutral-700">Belum ada riwayat prediksi.</p>
          <Link href="/predict" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Mulai Prediksi
          </Link>
        </div>
      ) : (
        <>
          {/* Optimized Table View - O(n) render */}
          <div className="overflow-x-auto rounded-lg border border-emerald-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-900">Label</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-900">Keyakinan</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-900">Sumber</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-900">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {rows.map((row) => {
                  const confidencePct = getConfidencePercentage(row.confidence)
                  const formattedDate = formatDate(row.occurred_at)

                  return (
                    <tr key={row.id} className="hover:bg-emerald-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{row.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-emerald-100">
                            <div
                              className="h-1.5 rounded-full bg-emerald-500"
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-emerald-700">{confidencePct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                          {row.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{formattedDate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination - Optimized */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Link
                href={canPrev ? `/history?page=${page - 1}` : `/history?page=${page}`}
                aria-disabled={!canPrev}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  canPrev
                    ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                    : 'cursor-not-allowed border-neutral-200 text-neutral-400'
                }`}
              >
                ← Prev
              </Link>
              <Link
                href={canNext ? `/history?page=${page + 1}` : `/history?page=${page}`}
                aria-disabled={!canNext}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  canNext
                    ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                    : 'cursor-not-allowed border-neutral-200 text-neutral-400'
                }`}
              >
                Next →
              </Link>
            </div>
            <div className="text-xs text-neutral-600">
              Halaman <span className="font-semibold">{page}</span> dari <span className="font-semibold">{totalPages}</span>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
