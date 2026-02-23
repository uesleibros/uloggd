import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const noOpLock = async (name, acquireTimeout, fn) => { return await fn(); };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noOpLock,
  }
})
