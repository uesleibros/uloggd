import { supabase } from "../../lib/supabase-ssr.js"

export async function createNotification({ userId, type, data }) {
  if (!userId || !type) return

  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, type, data })

  if (error) console.error("notification error:", error)
}
