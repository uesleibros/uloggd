import { supabase } from "../../lib/supabase-ssr.js"

export async function createNotification({ userId, type, data, dedupeKey }) {
  if (!userId || !type) return

  if (dedupeKey) {
    const query = supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("read", false)

    for (const [key, value] of Object.entries(dedupeKey)) {
      query.eq(`data->>${key}`, String(value))
    }

    const { data: existing } = await query.maybeSingle()
    if (existing) return
  }

  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, type, data })

  if (error) console.error("notification error:", error)
}
