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

  if (!lastChest)
    return res.json({ canOpen: true })

  const now = new Date()
  const last = new Date(lastChest.opened_at)
  const remaining = 86400000 - (now.getTime() - last.getTime())

  if (remaining <= 0)
    return res.json({ canOpen: true })

  return res.json({
    canOpen: false,
    secondsLeft: Math.ceil(remaining / 1000),
  })
}