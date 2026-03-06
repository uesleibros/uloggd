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

  const todayMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))

  if (new Date(lastChest.opened_at) < todayMidnight) {
    return res.json({ canOpen: true })
  }

  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1)

  return res.json({
    canOpen: false,
    secondsLeft: Math.floor((tomorrowMidnight - now) / 1000),
  })
}