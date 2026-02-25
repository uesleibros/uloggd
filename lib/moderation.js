import { supabase } from "#lib/supabase-ssr.js"

export async function ensureUserNotBanned(userId) {
  if (!userId) return

  const { data, error } = await supabase
    .from("users")
    .select("is_banned")
    .eq("user_id", userId)
    .single()

  if (error) throw new Error("user_lookup_failed")

  if (data?.is_banned) {
    throw new Error("target_banned")
  }
}