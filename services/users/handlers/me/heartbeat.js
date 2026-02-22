import { supabase } from "#lib/supabase-ssr.js"

export async function handleHeartbeat(req, res) {
  const { status } = req.body

  await supabase
    .from("users")
    .update({
      last_seen: new Date().toISOString(),
      status: status || "online",
    })
    .eq("user_id", req.user.id)

  res.json({ ok: true })
}
