import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { createClient } from '../utils/supabase/server'

// Helper to check if a URL is valid for images
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  // Must start with / or http:// or https://
  return trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')
}

export default async function HomePage() {
  const supabase = createClient(cookies())
  const { data: latest } = await supabase
    .from('articles')
    .select('id,title,summary,cover_url,created_at,content_url')
    .order('created_at', { ascending: false })
    .limit(6)
  const extractDirectUrl = (val?: string) => {
    const raw = String(val || '').trim()
    if (!raw) return ''
    try {
      const u = new URL(raw)
      if (u.hostname === 'www.google.com' && u.pathname === '/url' && u.searchParams.get('q')) {
        return u.searchParams.get('q') as string
      }
      return raw
    } catch {
      return raw
    }
  }
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Perawatan Kulit Berbasis AI</h1>
          <p className="mt-3 text-neutral-600 sm:mt-4">SkinAI membantu menganalisis kondisi kulit wajah Anda dan merekomendasikan produk perawatan yang sesuai. Semua berjalan di perangkat Anda dengan ONNX Runtime Web.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link href="/predict" className="w-full rounded bg-emerald-600 px-5 py-2.5 text-center text-white hover:bg-emerald-700 sm:w-auto">Mulai Prediksi</Link>
            <Link href="/about" className="w-full rounded border border-emerald-600 px-5 py-2.5 text-center text-emerald-700 hover:bg-emerald-50 sm:w-auto">Pelajari Lebih Lanjut</Link>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <Image
            src="/brandProfile-large.png"
            alt="SkinAI brand profile"
            width={640}
            height={480}
            sizes="(max-width: 768px) 100vw, 640px"
            className="h-auto w-full max-w-[640px] rounded-lg border border-neutral-200"
            priority
          />
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-emerald-900">Artikel Terbaru</h2>
          <Link href="/articles" className="text-sm text-emerald-700 hover:underline">Lihat semua</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {(latest ?? []).map((a) => {
            const src = extractDirectUrl(a.cover_url)
            const href = extractDirectUrl(a.content_url)
            const validImageSrc = isValidImageUrl(src) ? src : null
            const CardInner = (
              <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                {validImageSrc ? (
                  <Image
                    src={validImageSrc}
                    alt={a.title}
                    width={640}
                    height={360}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="mb-3 h-40 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h3 className="line-clamp-2 text-lg font-semibold text-neutral-900">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-neutral-700">{a.summary}</p>
                {href ? (
                  <div className="mt-3 text-sm font-medium text-emerald-700">
                    <span className="underline decoration-emerald-300 underline-offset-4 group-hover:decoration-emerald-500">Baca Selengkapnya →</span>
                  </div>
                ) : null}
              </article>
            )
            return href ? (
              <a
                key={a.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {CardInner}
              </a>
            ) : (
              <div key={a.id}>{CardInner}</div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
