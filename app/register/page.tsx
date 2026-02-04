"use client"
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    setLoading(true)
    setMsg('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setMsg(error.message)
    else if (data?.user?.identities && data.user.identities.length === 0) setMsg('Akun sudah ada. Silakan masuk.')
    else {
      const user = data?.user
      if (user) {
        await supabase
          .from('app_users')
          .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
      }
      setMsg('Registrasi berhasil. Silakan cek email Anda.')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white to-emerald-50/50">
      <div className="w-full max-w-md animate-slideUp">
        
        {/* CARD DENGAN SHADOW YANG DIPERBAIKI */}
        <div className="overflow-hidden rounded-[2.5rem] border border-emerald-100/50 bg-white p-8 shadow-[0_20px_50px_rgba(16,185,129,0.12)] transition-shadow hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)]">
          
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-neutral-900">
              Buat <span className="text-emerald-600">Akun</span>
            </h2>
            <p className="mt-2 text-sm text-neutral-500">Simpan riwayat kesehatan kulit Anda.</p>
          </div>

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
              <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-neutral-400">Password</label>
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
              onClick={signUp} 
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 font-bold text-white shadow-[0_10px_20px_rgba(5,150,105,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_25px_rgba(5,150,105,0.4)] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>

            {msg && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700 animate-fadeIn">
                {msg}
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-neutral-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-bold text-emerald-600 hover:underline">Masuk</Link>
          </div>
        </div>
      </div>
    </main>
  )
}