import { supabase } from "#lib/supabase-ssr.js"

function getSecondsUntilMidnightBRT() {
  const now = new Date()
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const tomorrow = new Date(Date.UTC(
    brt.getUTCFullYear(),
    brt.getUTCMonth(),
    brt.getUTCDate() + 1
  ))
  
  tomorrow.setTime(tomorrow.getTime() + 3 * 60 * 60 * 1000)
  
  return Math.floor((tomorrow - now) / 1000)
}

function getTodayBRT() {
  const now = new Date()
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 10)
}

function getDateBRT(date) {
  const brt = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 10)
}

export async function handleStatus(req, res) {
  const { data: lastChest } = await supabase
    .from("user_chests")
    .select("opened_at")
    .eq("user_id", req.user.id)
    .eq("chest_type", "daily")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single()

  if (!lastChest)
    return res.json({ canOpen: true })

  const todayBRT = getTodayBRT()
  const lastBRT = getDateBRT(lastChest.opened_at)

  if (lastBRT < todayBRT)
    return res.json({ canOpen: true })

  return res.json({
    canOpen: false,
    secondsLeft: getSecondsUntilMidnightBRT(),
  })
}