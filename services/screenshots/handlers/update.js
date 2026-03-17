import { supabase } from "#lib/supabase-ssr.js"

export async function handleUpdate(req, res) {
  const { screenshotId, caption, gameId, gameSlug, isSpoiler } = req.body

  if (!screenshotId) return res.status(400).json({ error: "screenshotId required" })

  try {
    const { data: existing } = await supabase
      .from("screenshots")
      .select("id")
      .eq("id", screenshotId)
      .eq("user_id", req.user.id)
      .single()

    if (!existing) return res.status(404).json({ error: "not found" })

    const updates = {}
    if (caption !== undefined) updates.caption = caption?.trim() || null
    if (gameId !== undefined) updates.game_id = gameId || null
    if (gameSlug !== undefined) updates.game_slug = gameSlug || null
    if (isSpoiler !== undefined) updates.is_spoiler = !!isSpoiler

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "nothing to update" })
    }

    const { data, error } = await supabase
      .from("screenshots")
      .update(updates)
      .eq("id", screenshotId)
      .eq("user_id", req.user.id)
      .select("id, image_url, game_id, game_slug, caption, is_spoiler, position, created_at")
      .single()

    if (error) throw error

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}