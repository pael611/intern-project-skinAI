"use client"
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const signInPassword = async () => {
    setLoading(true)
    setMsg('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    else {
      const user = data.user
      if (user) {
        const { error: upErr } = await supabase
          .from('app_users')
          .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
        if (upErr) console.warn('Upsert app_users warning:', upErr.message)
      }
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect') || '/'
      window.location.assign(redirect)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white to-emerald-50/50">
      <div className="w-full max-w-md animate-slideUp">
        
        {/* Card dengan Shadow Emerald */}
        <div className="overflow-hidden rounded-[2.5rem] border border-emerald-100/50 bg-white p-8 shadow-[0_20px_50px_rgba(16,185,129,0.12)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)]">
          
          {/* Header Section */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-neutral-900">
              Selamat <span className="text-emerald-600">Datang</span>
            </h2>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              Masuk untuk mengelola profil dan riwayat prediksi kesehatan kulit Anda.
            </p>
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="nama@email.com" 
                className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-4 py-3.5 text-sm transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">Password</label>
                <Link href="#" className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-tight">Lupa Password?</Link>
              </div>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full rounded-2xl border-2 border-neutral-50 bg-neutral-50 px-4 py-3.5 text-sm transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
              />
            </div>

            <button 
              disabled={loading || !email || !password} 
              onClick={signInPassword} 
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 font-bold text-white shadow-[0_10px_20px_rgba(5,150,105,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_25px_rgba(5,150,105,0.4)] active:scale-[0.98] disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Masuk Sekarang"
                )}
              </span>
            </button>

            {/* Error Message */}
            {msg && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-800 animate-fadeIn">
                {msg}
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="mt-8 text-center text-sm text-neutral-500">
            Belum punya akun?{' '}
            <Link href="/register" className="font-bold text-emerald-600 hover:underline">
              Daftar di sini
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}