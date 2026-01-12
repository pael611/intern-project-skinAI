import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { requireEnv } from "@/lib/env.server"

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // ignore in server components w/o mutable cookies
        }
      },
    },
  })
}
