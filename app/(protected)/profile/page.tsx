import { cookies } from 'next/headers'
import { createClient } from '../../../utils/supabase/server'
import Link from 'next/link'
import ProductSlideCarousel from '../../../components/ProductSlideCarousel'
import { getEmailInitials, getUnique } from '../../../lib/utils'

interface Product {
  id_product: string
  nama_product: string
  label: string
  brand: string
  harga: number
  gambar?: string
  link?: string
  created_at: string
}

interface Prediction {
  id: string
  label: string
}

/**
 * ProfilePage - Server Component
 * TC: O(n*m) dimana n=predictions, m=products per label
 * SC: O(n*m) untuk storing products
 */
export default async function ProfilePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-center text-2xl font-bold text-emerald-800">Profil</h2>
          <p className="text-center text-neutral-700">Anda belum masuk.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/login" className="inline-block rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700">Masuk</Link>
          </div>
        </div>
      </main>
    )
  }

  // Single query untuk count
  const { count } = await supabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Get predictions dengan limit untuk optimasi
  const { data: predictions } = await supabase
    .from('predictions')
    .select('id, label')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) as { data: Prediction[] | null }

  // Extract unique tags - TC: O(n), SC: O(k) dimana k = unique count
  const uniqueTags = getUnique(predictions || [], (p) => p.label)

  // Fetch ALL products dari semua tags dalam satu collection
  let allProducts: Product[] = []
  
  if (uniqueTags.length > 0) {
    // Parallel fetch semua produk dari setiap tag
    const productPromises = uniqueTags.map((tag) =>
      supabase
        .from('product')
        .select('id_product, nama_product, label, brand, harga, gambar, link, created_at')
        .eq('label', tag)
        .order('created_at', { ascending: false })
    )

    const productResults = await Promise.all(productPromises)

    // Flatten semua produk dari semua tags - TC: O(n*m), SC: O(n*m)
    allProducts = productResults
      .flatMap((result) => (result.data || []) as Product[])
      // Remove duplikat berdasarkan id_product
      .filter((product, index, self) => 
        index === self.findIndex((p) => p.id_product === product.id_product)
      )
      // Sort by created_at descending
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const initials = getEmailInitials(user.email || '?')

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">Profil Kesehatan</h1>
        <p className="mt-1 text-neutral-600">Kelola akun Anda dan ringkasan riwayat prediksi kulit.</p>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
              {initials}
            </div>
            <div>
              <div className="text-sm text-neutral-500">Email</div>
              <div className="truncate text-lg font-medium text-neutral-900">{user.email}</div>
              <div className="mt-1 text-xs text-neutral-500">ID: <span className="font-mono break-all text-neutral-700">{user.id}</span></div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/predict" className="rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700">Mulai Prediksi</Link>
            <Link href="/history" className="rounded-lg border border-emerald-200 px-4 py-2 text-emerald-800 hover:bg-emerald-50">Lihat Riwayat</Link>
            <Link href="/" className="rounded-lg border border-neutral-200 px-4 py-2 text-neutral-700 hover:bg-neutral-50">Beranda</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-sm text-neutral-500">Ringkasan</div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-emerald-800">{count ?? 0}</div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Total Prediksi</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">Jumlah prediksi kulit yang tersimpan pada akun ini.</p>
          </div>
        </div>
      </section>

      {/* Tags Section */}
      {uniqueTags.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-emerald-900">Tag Prediksi Anda</h2>
          <div className="flex flex-wrap gap-2">
            {uniqueTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Products Section with Slide Carousel */}
      {allProducts.length > 0 && (
        <section className="mt-8">
          <ProductSlideCarousel products={allProducts} />
        </section>
      )}

      {/* Empty State */}
      {uniqueTags.length === 0 && (
        <section className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="text-neutral-700">Belum ada prediksi. Lakukan prediksi terlebih dahulu untuk melihat produk yang direkomendasikan.</p>
          <Link href="/predict" className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700">
            Mulai Prediksi
          </Link>
        </section>
      )}
    </main>
  )
}
