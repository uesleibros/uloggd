import { supabase } from "#lib/supabase-ssr.js"

export async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  return user
}