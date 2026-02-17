import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch logs" })
  }
}
