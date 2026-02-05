import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { createClient } from '../utils/supabase/server'

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Mengambil 6 artikel terbaru
  const { data: latest } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-transparent pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md border border-emerald-100">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Smart Skincare AI</span>
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-neutral-900 leading-[1.1] sm:text-6xl">
                Perawatan Kulit <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Berbasis AI</span>
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-xl">
                Analisis kondisi wajah Anda dalam hitungan detik dengan teknologi <span className="font-semibold text-emerald-700">ONNX Runtime</span>.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                <Link href="/predict" className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-center font-bold text-white shadow-xl transition-all hover:scale-105 sm:w-auto">
                  Mulai Prediksi Gratis
                </Link>
              </div>
            </div>
            <div className="relative flex justify-center md:justify-end">
              <div className="relative z-10 overflow-hidden rounded-[2.5rem] shadow-2xl ring-8 ring-white">
                {/* Gambar Profil Brand */}
                <Image src="/brandProfile-large.png" alt="SkinAI" width={640} height={480} className="h-auto w-full object-cover" priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="mx-auto mt-[-4rem] max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mb-10 flex items-end justify-between border-b border-neutral-200 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900">Artikel Terbaru</h2>
            <p className="mt-2 text-neutral-500">Tips edukasi seputar kesehatan kulit wajah.</p>
          </div>
          <Link href="/articles" className="group flex items-center gap-2 font-bold text-emerald-600 hover:text-emerald-700">
            Lihat semua <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {(latest ?? []).map((a) => (
            <Link 
              key={a.id} 
              href={a.content_url || '#'} 
              target="_blank"
              className="group flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative h-56 w-full overflow-hidden bg-neutral-100">
                {a.cover_url ? (
                  <Image 
                    src={a.cover_url} 
                    alt={a.title} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                    unoptimized // PENTING: Agar gambar eksternal (Unsplash/Alodokter) muncul
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-200">
                     <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <div className="absolute bottom-4 left-4">
                  <span className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm">
                    {a.source || 'Edukasi'}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-1 flex-col p-6">
                <h3 className="line-clamp-2 text-xl font-bold text-neutral-900 group-hover:text-emerald-600 transition-colors">
                  {a.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-500">
                  {a.summary}
                </p>
                <div className="mt-auto pt-6 flex items-center gap-2 text-sm font-bold text-emerald-600">
                  Baca Selengkapnya
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}