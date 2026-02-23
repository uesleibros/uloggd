import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const customLock = {
  acquire: async (name, acquireCallback) => await acquireCallback(),
  release: async (name) => {}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: customLock,
  }
})
