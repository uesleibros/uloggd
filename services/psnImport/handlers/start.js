import { supabase } from "#lib/supabase-ssr.js"
import { getPsnToken } from "#services/psn/utils/psnAuth.js"

const PSN_API_URL = "https://m.np.playstation.com/api"

export async function handleStart(req, res) {
  const { data: connection } = await supabase
    .from("user_connections")
    .select("provider_user_id, provider_display_name")
    .eq("user_id", req.user.id)
    .eq("provider", "psn")
    .maybeSingle()

  if (!connection) {
    return res.status(401).json({ error: "psn not connected" })
  }

  const { data: existing } = await supabase
    .from("import_jobs")
    .select("id, status")
    .eq("user_id", req.user.id)
    .eq("source", "psn")
    .in("status", ["fetching", "running"])
    .maybeSingle()

  if (existing) {
    return res.status(409).json({ error: "import already running", job_id: existing.id })
  }

  const { data: job, error: createError } = await supabase
    .from("import_jobs")
    .insert({
      user_id: req.user.id,
      source: "psn",
      source_username: connection.provider_display_name,
      status: "fetching",
    })
    .select("id")
    .single()

  if (createError) {
    console.error(createError)
    return res.status(500).json({ error: "fail" })
  }

  try {
    const accessToken = await getPsnToken(req.user.id)

    const response = await fetch(
      `${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/trophyTitles?limit=800`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error("Failed to fetch PSN games")
    }

    const games = (data.trophyTitles || []).map(title => ({
      name: title.trophyTitleName,
      platform: title.trophyTitlePlatform,
      npCommunicationId: title.npCommunicationId,
      progress: title.progress,
      earnedTrophies: title.earnedTrophies,
      lastUpdated: title.lastUpdatedDateTime,
    }))

    if (games.length === 0) {
      await supabase
        .from("import_jobs")
        .update({
          status: "completed",
          total: 0,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id)

      return res.json({ job_id: job.id, total: 0, status: "completed" })
    }

    await supabase
      .from("import_jobs")
      .update({
        status: "running",
        games_data: games,
        total: games.length,
      })
      .eq("id", job.id)

    return res.json({ job_id: job.id, total: games.length, status: "running" })
  } catch (e) {
    console.error(e)
    await supabase
      .from("import_jobs")
      .update({
        status: "failed",
        error: e.message || "fetching failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    return res.status(500).json({ error: "fetching failed", job_id: job.id })
  }
}
