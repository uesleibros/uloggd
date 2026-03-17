import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { findManyByIds, resolveStreams, formatUserMap } from "#models/users/index.js"

export async function handleGet(req, res) {
  const { screenshotId } = req.query
  if (!screenshotId) return res.status(400).json({ error: "screenshotId required" })

  try {
    const { data: screenshot, error } = await supabase
      .from("screenshots")
      .select("*")
      .eq("id", screenshotId)
      .single()

    if (error?.code === "PGRST116") return res.status(404).json({ error: "not found" })
    if (error) throw error

    const profiles = await findManyByIds([screenshot.user_id])
    const streamsMap = await resolveStreams(profiles)
    const users = formatUserMap(profiles, streamsMap)

    let game = null
    if (screenshot.game_id) {
      const gamesData = await query(
        "games",
        `fields id, name, slug, cover.url, cover.image_id; where id = (${screenshot.game_id}); limit 1;`
      )

      if (gamesData?.[0]) {
        const g = gamesData[0]
        game = {
          id: g.id,
          name: g.name,
          slug: g.slug,
          cover: g.cover ? {
            url: g.cover.url?.replace("t_thumb", "t_cover_big"),
            image_id: g.cover.image_id,
          } : null,
        }
      }
    }

    const { count: likesCount } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", "screenshot")
      .eq("target_id", screenshot.id)

    const { count: commentsCount } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("target_type", "screenshot")
      .eq("target_id", String(screenshot.id))

    res.json({
      screenshot: {
        ...screenshot,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
      },
      user: users[screenshot.user_id] || null,
      game,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}