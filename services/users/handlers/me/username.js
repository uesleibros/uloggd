import { supabase } from "#lib/supabase-ssr.js"

const MIN_USERNAME = 2
const MAX_USERNAME = 32
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const COOLDOWN_DAYS = 30

export async function handleUsername(req, res) {
  const { username } = req.body

  if (!username || typeof username !== "string")
    return res.status(400).json({ error: "missing username" })

  const trimmed = username.trim()

  if (trimmed.length < MIN_USERNAME)
    return res.status(400).json({ error: `min ${MIN_USERNAME} characters` })

  if (trimmed.length > MAX_USERNAME)
    return res.status(400).json({ error: `max ${MAX_USERNAME} characters` })

  if (!USERNAME_REGEX.test(trimmed))
    return res.status(400).json({ error: "only letters, numbers and underscores" })

  const { data: profile } = await supabase
    .from("users")
    .select("username_changed_at")
    .eq("user_id", req.user.id)
    .single()

  if (profile?.username_changed_at) {
    const last = new Date(profile.username_changed_at).getTime()
    const now = Date.now()
    const diff = now - last
    const remaining = COOLDOWN_DAYS * 86400000 - diff

    if (remaining > 0) {
      const days = Math.ceil(remaining / 86400000)
      return res.status(429).json({ error: `wait ${days} days`, days })
    }
  }

  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const taken = existing?.users?.find(
    u => u.id !== req.user.id &&
    u.user_metadata?.full_name?.toLowerCase() === trimmed.toLowerCase()
  )

  if (taken) return res.status(409).json({ error: "username taken" })

  const { error: authError } = await supabase.auth.admin.updateUserById(req.user.id, {
    user_metadata: { full_name: trimmed },
  })

  if (authError) {
    console.error(authError)
    return res.status(500).json({ error: "fail" })
  }

  await supabase
    .from("users")
    .update({ username_changed_at: new Date().toISOString() })
    .eq("user_id", req.user.id)

  res.json({ username: trimmed })
}