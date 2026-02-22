import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#lib/auth.js"

export async function handleHeartbeat(req, res) {
  const { status, _authToken } = req.body

  let user = await getUser(req)

  if (!user && _authToken) {
    const { data, error } = await supabase.auth.getUser(_authToken)
    if (!error && data?.user) {
      user = data.user
    }
  }

  if (!user) {
    return res.status(401).json({ error: "unauthorized" })
  }

  await supabase
    .from("users")
    .update({
      last_seen: new Date().toISOString(),
      status: status || "online",
    })
    .eq("user_id", user.id)

  res.json({ ok: true })
}
