import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handlePopularScreenshots(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 12, 24)

  const cacheKey = `home_popular_screenshots_${limit}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: likes, error: likesError } = await supabase
      .from("screenshot_likes")
      .select("screenshot_id")

    if (likesError) throw likesError

    if (!likes || likes.length === 0) {
      return res.json({ screenshots: [] })
    }

    const likesCountMap = {}
    for (const like of likes) {
      likesCountMap[like.screenshot_id] = (likesCountMap[like.screenshot_id] || 0) + 1
    }

    const topScreenshotIds = Object.entries(likesCountMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => Number(id))

    if (topScreenshotIds.length === 0) {
      return res.json({ screenshots: [] })
    }

    const { data: screenshots, error: screenshotsError } = await supabase
      .from("screenshots")
      .select("id, user_id, game_id, game_slug, image_url, caption, is_spoiler, created_at")
      .in("id", topScreenshotIds)

    if (screenshotsError) throw screenshotsError

    if (!screenshots || screenshots.length === 0) {
      return res.json({ screenshots: [] })
    }

    const userIds = [...new Set(screenshots.map((s) => s.user_id))]

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("user_id, username, avatar")
      .in("user_id", userIds)

    if (usersError) throw usersError

    const usersMap = {}
    for (const user of users || []) {
      usersMap[user.user_id] = user
    }

    const result = screenshots
      .map((screenshot) => ({
        ...screenshot,
        likes_count: likesCountMap[screenshot.id] || 0,
        user: usersMap[screenshot.user_id] || null,
      }))
      .sort((a, b) => {
        if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count
        return new Date(b.created_at) - new Date(a.created_at)
      })

    const response = { screenshots: result }

    await setCache(cacheKey, response, 300)

    res.json(response)
  } catch (e) {
    console.error("popularScreenshots error:", e)
    res.status(500).json({ error: "fail" })
  }
}
