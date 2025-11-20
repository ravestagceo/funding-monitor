import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// For server-side operations that need elevated permissions
export function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase environment variables not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}
