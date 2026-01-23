import { cookies } from 'next/headers'
import { createClient } from '../../../../utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams?: { created?: string }
}) {
  const supabase = createClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/articles')
  const { data: adminRow } = await supabase.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminRow) redirect('/')

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-emerald-900">Kelola Artikel</h1>

      {searchParams?.created === '1' ? (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <div>
            <div className="font-semibold">Artikel berhasil ditambahkan.</div>
            <div className="text-sm text-emerald-800">Form sudah di-refresh dan siap untuk input berikutnya.</div>
          </div>
          <a
            href="/admin/articles"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Tutup
          </a>
        </div>
      ) : null}

      <form action={async (formData: FormData) => {
        'use server'
        const sanitizeUrl = (url: string) => {
          const val = String(url || '').trim()
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
        const title = String(formData.get('title') || '')
        const summary = String(formData.get('summary') || '')
        const content_url = sanitizeUrl(String(formData.get('content_url') || ''))
        const cover_url = sanitizeUrl(String(formData.get('cover_url') || ''))
        const source = String(formData.get('source') || 'bacaan')
        const s = createClient(cookies())
        const { error } = await s.from('articles').insert({ title, summary, content_url, cover_url, source })
        if (error) throw new Error(error.message)

        redirect('/admin/articles?created=1')
      }} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <input name="title" placeholder="Judul" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <textarea name="summary" placeholder="Ringkasan" rows={3} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <input name="content_url" placeholder="URL konten (opsional)" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <input name="cover_url" placeholder="URL gambar sampul (opsional)" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
        <select name="source" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
          <option value="bacaan">Bacaan</option>
          <option value="koran">Koran</option>
        </select>
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Publikasikan</button>
      </form>
    </main>
  )
}
