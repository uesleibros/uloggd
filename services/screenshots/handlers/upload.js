import { supabase } from "#lib/supabase-ssr.js"
import { uploadToImgchest } from "#services/users/utils/imgchest.js"

export async function handleUpload(req, res) {
  const { image, gameId, gameSlug, caption, isSpoiler } = req.body

  if (!image) return res.status(400).json({ error: "no image" })

  try {
    const { count } = await supabase
      .from("screenshots")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id)

    const imageUrl = await uploadToImgchest(image)

    const { data, error } = await supabase
      .from("screenshots")
      .insert({
        user_id: req.user.id,
        game_id: gameId || null,
        game_slug: gameSlug || null,
        image_url: imageUrl,
        caption: caption?.trim() || null,
        is_spoiler: !!isSpoiler,
        position: count || 0,
      })
      .select("id, image_url, game_id, game_slug, caption, is_spoiler, position, created_at")
      .single()

    if (error) throw error

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}