import { supabase } from "#lib/supabase-ssr.js"

function generateDedupeHash(userId, type, dedupeKey) {
  const str = `${userId}:${type}:${JSON.stringify(dedupeKey)}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

export async function createNotification({ userId, type, data, dedupeKey }) {
  if (!userId || !type) return

  if (dedupeKey) {
    const { error } = await supabase
      .from("notifications")
      .upsert({
        user_id: userId,
        type,
        data,
        dedupe_hash: generateDedupeHash(userId, type, dedupeKey)
      }, {
        onConflict: "dedupe_hash",
        ignoreDuplicates: true
      })

    if (error && error.code !== "23505") {
      console.error("notification error:", error)
    }
  } else {
    const { error } = await supabase
      .from("notifications")
      .insert({ user_id: userId, type, data })

    if (error) {
      console.error("notification error:", error)
    }
  }
}
