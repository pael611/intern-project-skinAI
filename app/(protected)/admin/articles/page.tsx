"use client"
import { useEffect, useState } from 'react'
import { createClient } from '../../../../utils/supabase/client'

export default function ArticleAdminPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  
  const [form, setForm] = useState({
    title: '',
    summary: '',
    cover_url: '',
    content_url: '',
    source: 'bacaan' // Gunakan huruf kecil sesuai standar database umumnya
  })

  const supabase = createClient()

  const fetchArticles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setArticles(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchArticles() }, [])

  const openModal = (article: any = null) => {
    if (article) {
      setSelectedArticle(article)
      setForm({
        title: article.title || '',
        summary: article.summary || '',
        cover_url: article.cover_url || '',
        content_url: article.content_url || '',
        source: article.source || 'bacaan'
      })
    } else {
      setSelectedArticle(null)
      setForm({ title: '', summary: '', cover_url: '', content_url: '', source: 'bacaan' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Memisahkan id dan created_at agar tidak ikut ter-update (mencegah error column id)
    const { id, created_at, ...updateData } = form as any;

    if (selectedArticle?.id) {
      const { error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', selectedArticle.id)

      if (error) alert("Gagal update: " + error.message)
      else {
        setIsModalOpen(false)
        fetchArticles()
      }
    } else {
      const { error } = await supabase.from('articles').insert([form])
      if (error) alert("Gagal simpan: " + error.message)
      else {
        setIsModalOpen(false)
        fetchArticles()
      }
    }
    setLoading(false)
  }

  const handleDelete = async (id: any) => {
    if (!confirm('Hapus artikel ini secara permanen?')) return
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (!error) fetchArticles()
    else alert("Gagal hapus: " + error.message)
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">Articles Master</h1>
            <p className="text-neutral-500">Kelola konten edukasi untuk platform SkinAI.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-emerald-700 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Artikel
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-hidden rounded-[2rem] border border-emerald-50 bg-white shadow-xl shadow-emerald-100/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100">
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-emerald-800">ID</th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Sampul</th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Judul</th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Jenis</th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-emerald-800 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!loading && articles.map((article) => (
                    <tr key={article.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-neutral-500">{article.id}</td>
                      <td className="px-6 py-4">
                        <div className="h-10 w-16 overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
                          <img src={article.cover_url} alt="" className="h-full w-full object-cover" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="line-clamp-1 text-sm font-bold text-neutral-800">{article.title}</p>
                        <p className="line-clamp-1 text-[11px] text-neutral-400 mt-0.5">{article.summary}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 uppercase">
                          {article.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-4">
                          <button onClick={() => openModal(article)} className="text-emerald-600 hover:text-emerald-800"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDelete(article.id)} className="text-red-500 hover:text-red-700"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CRUD DENGAN BACKDROP BLUR & DROPDOWN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-slate-50">
              <h2 className="text-2xl font-black text-neutral-900">{selectedArticle ? 'Edit Artikel' : 'Artikel Baru'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Judul Artikel</label>
                <input required placeholder="Judul" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-5 py-3 focus:border-emerald-400 focus:bg-white focus:outline-none transition-all" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Ringkasan Singkat</label>
                <textarea required placeholder="Ringkasan" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className="w-full h-24 rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-5 py-3 focus:border-emerald-400 focus:bg-white focus:outline-none resize-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">URL Sampul</label>
                  <input placeholder="https://..." value={form.cover_url} onChange={e => setForm({...form, cover_url: e.target.value})} className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-5 py-3 focus:border-emerald-400 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Jenis Konten</label>
                  <select 
                    required 
                    value={form.source} 
                    onChange={e => setForm({...form, source: e.target.value})} 
                    className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-5 py-3 focus:border-emerald-400 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    {/* Gunakan value huruf kecil agar sesuai dengan database constraint */}
                    <option value="bacaan">Bacaan</option>
                    <option value="koran">Koran</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Link Sumber Artikel</label>
                <input placeholder="https://..." value={form.content_url} onChange={e => setForm({...form, content_url: e.target.value})} className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-5 py-3 focus:border-emerald-400 focus:bg-white transition-all" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl border-2 border-neutral-100 py-4 font-bold text-neutral-500 hover:bg-neutral-50 transition-all">Batal</button>
                <button disabled={loading} className="flex-1 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all">
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}