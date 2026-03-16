import { supabase } from "#lib/supabase-ssr.js"

const RA_API_BASE = "https://retroachievements.org/API"

async function getProfile(username, apiKey) {
  const res = await fetch(
    `${RA_API_BASE}/API_GetUserSummary.php?z=${encodeURIComponent(username)}&y=${apiKey}&u=${encodeURIComponent(username)}`
  )

  if (!res.ok) throw new Error("Failed to fetch RA profile")

  const data = await res.json()

  if (!data || data.ID === undefined) {
    throw new Error("Invalid API key or username")
  }

  return {
    id: String(data.ID),
    username: data.User,
    avatar: data.UserPic ? `https://retroachievements.org${data.UserPic}` : null,
    points: data.TotalPoints || 0,
    softcorePoints: data.TotalSoftcorePoints || 0,
    rank: data.Rank || null,
    memberSince: data.MemberSince || null,
  }
}

export async function handleConnect(req, res) {
  const { apiKey } = req.body

  if (!apiKey?.trim()) {
    return res.status(400).json({ error: "apiKey required" })
  }

  try {
    const profile = await getProfile(req.user.id, apiKey.trim())

    await supabase
      .from("user_connections")
      .upsert({
        user_id: req.user.id,
        provider: "retroachievements",
        provider_user_id: profile.id,
        provider_username: profile.username,
        provider_display_name: profile.username,
        provider_avatar_url: profile.avatar,
        access_token: apiKey.trim(),
        extra_data: {
          points: profile.points,
          softcorePoints: profile.softcorePoints,
          rank: profile.rank,
          memberSince: profile.memberSince,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" })

    res.json({
      success: true,
      profile: {
        username: profile.username,
        avatar: profile.avatar,
        points: profile.points,
        rank: profile.rank,
      },
    })
  } catch (error) {
    console.error("RA connect error:", error.message)
    res.status(401).json({ success: false, error: "Invalid API key or username" })
  }
}
