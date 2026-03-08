import { supabase } from "#lib/supabase.js"

export const ITEMS_PREVIEW_COUNT = 6

export async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  }
}