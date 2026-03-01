import { supabase } from "#lib/supabase-ssr.js"

const COOLDOWN_SECONDS = 86400

export async function handleStatus(req, res) {
  const { data: lastChest } = await supabase
    .from("user_chests")
    .select("opened_at")
    .eq("user_id", req.user.id)
    .eq("chest_type", "daily")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single()

  if (!lastChest) {
    return res.json({ canOpen: true })
  }

  const lastOpened = new Date(lastChest.opened_at)
  const now = new Date()
  const diffSeconds = Math.floor((now - lastOpened) / 1000)

  if (diffSeconds >= COOLDOWN_SECONDS) {
    return res.json({ canOpen: true })
  }

  return res.json({
    canOpen: false,
    secondsLeft: COOLDOWN_SECONDS - diffSeconds,
  })
}