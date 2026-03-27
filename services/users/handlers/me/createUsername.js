import { supabase } from "#lib/supabase-ssr.js"

const MIN_USERNAME = 2
const MAX_USERNAME = 32
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.]*[a-zA-Z0-9]$/
const INVALID_PATTERNS = /\.\./

export async function handleCreateUsername(req, res) {
  const { username } = req.body

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username cannot be empty" })
  }

  const trimmed = username.trim().toLowerCase()

  if (trimmed.length < MIN_USERNAME) {
    return res.status(400).json({ error: `Minimum ${MIN_USERNAME} characters required` })
  }

  if (trimmed.length > MAX_USERNAME) {
    return res.status(400).json({ error: `Maximum ${MAX_USERNAME} characters allowed` })
  }

  if (!USERNAME_REGEX.test(trimmed) || INVALID_PATTERNS.test(trimmed)) {
    return res.status(400).json({ error: "Invalid username" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("username")
    .eq("user_id", req.user.id)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({ error: "User not found" })
  }

  if (profile.username) {
    return res.status(403).json({ error: "Username already set" })
  }

  const { data: taken } = await supabase
    .from("users")
    .select("user_id")
    .ilike("username", trimmed)
    .neq("user_id", req.user.id)
    .maybeSingle()

  if (taken) {
    return res.status(409).json({ error: "Username is already taken" })
  }

  const { error } = await supabase
    .from("users")
    .update({
      username: trimmed,
      username_changed_at: new Date().toISOString(),
    })
    .eq("user_id", req.user.id)

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "Failed to create username" })
  }

  return res.json({ username: trimmed })
}
