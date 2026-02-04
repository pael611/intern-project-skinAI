"use client"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { usePathname } from "next/navigation"
import AuthButtons from "./AuthButtons"
import { prefetchModel } from "../lib/modelPrefetch"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Predict", href: "/predict", prefetch: true },
    { name: "About", href: "/about" },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-50 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          
          {/* 1. KIRI: Logo Section (Lebar tetap/Fixed width agar seimbang) */}
          <div className="flex w-1/4 justify-start">
            <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-emerald-100">
                <Image
                  src="/brandLogo.png"
                  alt="SkinAI logo"
                  width={32}
                  height={32}
                  priority
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="hidden flex-col leading-none sm:flex">
                <span className="text-xl font-black tracking-tight text-neutral-900">
                  Skin<span className="text-emerald-600">AI</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  Smart Care
                </span>
              </div>
            </Link>
          </div>

          {/* 2. TENGAH: Navigation Links */}
          <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => link.prefetch && prefetchModel()}
                className={`relative rounded-xl px-5 py-2 text-sm font-bold transition-all duration-200 ${
                  isActive(link.href)
                    ? "text-emerald-700 bg-emerald-50/50"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-emerald-600"
                }`}
              >
                {link.name}
                {isActive(link.href) && (
                  <span className="absolute bottom-1 left-5 right-5 h-0.5 rounded-full bg-emerald-600" />
                )}
              </Link>
            ))}
          </nav>

          {/* 3. KANAN: Auth Buttons (Lebar tetap agar simetris dengan kiri) */}
          <div className="hidden w-1/4 items-center justify-end gap-2 md:flex">
            <AuthButtons />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex flex-1 justify-end md:hidden">
            <button
              aria-label="Toggle Menu"
              className="rounded-xl bg-neutral-50 p-2 text-neutral-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {open ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {open && (
          <div className="absolute left-0 right-0 top-full border-b border-emerald-50 bg-white/95 p-4 shadow-2xl backdrop-blur-lg animate-fadeIn md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (link.prefetch) prefetchModel()
                    setOpen(false)
                  }}
                  className={`rounded-xl px-4 py-3 text-base font-bold transition-colors ${
                    isActive(link.href)
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-emerald-600"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-2 border-t border-neutral-100 pt-4">
                <AuthButtons />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}