import Link from "next/link"
import Image from "next/image"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-emerald-50 bg-white pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-emerald-100">
                <Image
                  src="/brandLogo.png"
                  alt="SkinAI logo"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-neutral-900">
                Skin<span className="text-emerald-600">AI</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Solusi cerdas perawatan kulit wajah Anda menggunakan teknologi AI mutakhir yang berjalan langsung di perangkat Anda.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Navigasi</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-emerald-600">Beranda</Link>
              </li>
              <li>
                <Link href="/predict" className="text-sm text-neutral-500 transition-colors hover:text-emerald-600">Prediksi Kulit</Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-neutral-500 transition-colors hover:text-emerald-600">Tentang Kami</Link>
              </li>
            </ul>
          </div>

          {/* Contact/Social */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="#" className="text-sm text-neutral-500 transition-colors hover:text-emerald-600">Kebijakan Privasi</Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-neutral-500 transition-colors hover:text-emerald-600">Syarat & Ketentuan</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-neutral-100 pt-8 text-center md:flex md:items-center md:justify-between md:text-left">
          <p className="text-xs font-medium text-neutral-400">
            &copy; {currentYear} SkinAI. Health-focused AI for skincare. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center gap-6 md:mt-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI System Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}