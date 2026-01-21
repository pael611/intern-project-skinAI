import { createBrowserClient } from '@supabase/ssr'

// Public browser client using SSR helper to sync cookies for server visibility
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
}

export const supabase = createBrowserClient(supabaseUrl ?? '', supabasePublishableKey ?? '')

