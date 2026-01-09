"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("theme");
      const prefers = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      // Source of truth: current DOM class if present, else stored/local, else prefers
      const domHasDark = document.documentElement.classList.contains("dark");
      const dark = domHasDark || (stored ? stored === "dark" : prefers);
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      try { document.documentElement.style.colorScheme = dark ? "dark" : "light"; } catch {}
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (_) {}
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (_) {}
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try { document.documentElement.style.colorScheme = next ? "dark" : "light"; } catch {}
    // Fire a custom event for debugging or listeners
    try { window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next ? "dark" : "light" } })); } catch {}
  }

  if (!mounted) return null;

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      onClick={toggleTheme}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        // Sun icon
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-amber-400">
          <path d="M12 4V2M12 22v-2M4 12H2m20 0h-2M5 5l-1.5-1.5M20.5 20.5 19 19M19 5l1.5-1.5M4.5 20.5 6 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      ) : (
        // Moon icon
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-emerald-600">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
