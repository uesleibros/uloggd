import { supabase } from "#lib/supabase-ssr.js"

const RA_API_BASE = "https://retroachievements.org/API"

export async function handleRecent(req, res) {
  const { userId } = req.query

  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const { data: connection } = await supabase
      .from("user_connections")
      .select("provider_username, access_token")
      .eq("user_id", userId)
      .eq("provider", "retroachievements")
      .maybeSingle()

    if (!connection) {
      return res.json({ connected: false, achievements: [] })
    }

    const { provider_username: username, access_token: apiKey } = connection

    const url = `${RA_API_BASE}/API_GetUserRecentAchievements.php?z=${encodeURIComponent(username)}&y=${apiKey}&u=${encodeURIComponent(username)}&m=43200`
    const r = await fetch(url)

    if (!r.ok) {
      return res.json({ connected: true, achievements: [] })
    }

    const data = await r.json()

    if (!data || !Array.isArray(data)) {
      return res.json({ connected: true, achievements: [] })
    }

    const achievements = data.map(a => ({
      id: a.AchievementID,
      title: a.Title,
      description: a.Description,
      points: Number(a.Points),
      badgeUrl: a.BadgeName ? `https://media.retroachievements.org/Badge/${a.BadgeName}.png` : null,
      gameId: a.GameID,
      gameTitle: a.GameTitle,
      consoleName: a.ConsoleName,
      earnedDate: a.Date,
      hardcoreMode: a.HardcoreMode === 1,
    }))

    res.json({ connected: true, achievements })
  } catch (error) {
    console.error("RA recent error:", error.message)
    res.json({ connected: false, achievements: [] })
  }
}
