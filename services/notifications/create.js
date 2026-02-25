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

  const payload = { user_id: userId, type, data }

  if (dedupeKey) {
    payload.dedupe_hash = generateDedupeHash(userId, type, dedupeKey)
  }

  const { error } = await supabase
    .from("notifications")
    .upsert(payload, {
      onConflict: "dedupe_hash",
      ignoreDuplicates: true
    })

  if (error && error.code !== "23505") {
    console.error("notification error:", error)
  }
}
