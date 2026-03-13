import { supabase } from "#lib/supabase-ssr.js"
import { getPsnToken } from "#services/psn/utils/psnAuth.js"

const PSN_API_URL = "https://m.np.playstation.com/api"

async function fetchAllPsnGames(accessToken, accountId) {
  const allGames = []
  let offset = 0
  const limit = 800

  while (true) {
    const response = await fetch(
      `${PSN_API_URL}/trophy/v1/users/${accountId}/trophyTitles?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch PSN games")
    }

    const data = await response.json()
    const titles = data.trophyTitles || []
    
    allGames.push(...titles)

    if (titles.length < limit || allGames.length >= data.totalItemCount) {
      break
    }

    offset += limit
  }

  return allGames
}

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
    const trophyTitles = await fetchAllPsnGames(accessToken, connection.provider_user_id)

    const games = trophyTitles.map(title => ({
      name: title.trophyTitleName,
      platform: title.trophyTitlePlatform,
      npCommunicationId: title.npCommunicationId,
      npTitleId: title.npTitleId,
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
          imported: 0,
          skipped: 0,
          failed: 0,
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
