import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "missing userId" })

  try {
    const { data, error } = await supabase
      .from("users")
      .select("is_verified, is_moderator")
      .eq("user_id", userId)
      .single()

    if (error) return res.status(404).json({ error: "user not found" })

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}