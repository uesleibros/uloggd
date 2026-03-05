import { supabase } from "#lib/supabase-ssr.js"

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

  const now = new Date()
  const nextReset = new Date(now)
  nextReset.setUTCHours(0, 0, 0, 0)

  if (now >= nextReset) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1)
  }

  const lastOpened = new Date(lastChest.opened_at)

  const todayReset = new Date(now)
  todayReset.setUTCHours(0, 0, 0, 0)

  if (lastOpened < todayReset) {
    return res.json({ canOpen: true })
  }

  const secondsLeft = Math.floor((nextReset - now) / 1000)

  return res.json({
    canOpen: false,
    secondsLeft,
  })
}
