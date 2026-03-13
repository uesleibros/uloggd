import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 20

async function findGameByName(name) {
  const searchName = name.replace(/"/g, '\\"')

  const results = await query("games", `
    search "${searchName}";
    fields id, slug, name;
    limit 1;
  `)

  return results?.[0] || null
}

async function processBatch(games, userId) {
  const igdbResults = await Promise.all(
    games.map(g => g.name ? findGameByName(g.name) : Promise.resolve(null))
  )

  const validResults = igdbResults.filter(Boolean)
  
  if (validResults.length === 0) {
    return games.map(() => ({ status: "skipped" }))
  }

  const { data: existingGames } = await supabase
    .from("user_games")
    .select("game_id")
    .eq("user_id", userId)
    .in("game_id", validResults.map(g => g.id))

  const existingIds = new Set(existingGames?.map(g => g.game_id) || [])

  const results = []
  const toInsert = []

  for (let i = 0; i < games.length; i++) {
    const game = games[i]
    const igdbGame = igdbResults[i]

    if (!igdbGame) {
      results.push({ status: "skipped" })
      continue
    }

    if (existingIds.has(igdbGame.id)) {
      results.push({ status: "skipped" })
      continue
    }

    const hasProgress = game.progress > 0
    const isCompleted = game.progress === 100

    toInsert.push({
      user_id: userId,
      game_id: igdbGame.id,
      game_slug: igdbGame.slug,
      status: isCompleted ? "played" : hasProgress ? "playing" : "played",
      playing: hasProgress && !isCompleted
    })
    
    results.push({ status: "imported" })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("user_games").insert(toInsert)
    if (error) {
      return results.map(r => r.status === "imported" ? { status: "failed" } : r)
    }
  }

  return results
}

export async function handleProcess(req, res) {
  const { job_id } = req.body
  if (!job_id) return res.status(400).json({ error: "missing job_id" })

  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, status, progress, total, imported, skipped, failed, games_data")
    .eq("id", job_id)
    .eq("user_id", req.user.id)
    .single()

  if (!job || job.status !== "running") {
    return res.status(400).json({ error: "invalid job" })
  }

  const games = job.games_data ?? []
  const start = job.progress || 0
  const batch = games.slice(start, start + BATCH_SIZE)

  if (batch.length === 0) {
    await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        games_data: null,
      })
      .eq("id", job_id)

    return res.json({ 
      status: "completed",
      total: job.total,
      imported: job.imported || 0,
      skipped: job.skipped || 0,
      failed: job.failed || 0,
    })
  }

  const results = await processBatch(batch, req.user.id)

  const counts = { imported: 0, skipped: 0, failed: 0 }
  for (const r of results) counts[r.status]++

  const newProgress = start + batch.length

  await supabase
    .from("import_jobs")
    .update({
      progress: newProgress,
      imported: (job.imported || 0) + counts.imported,
      skipped: (job.skipped || 0) + counts.skipped,
      failed: (job.failed || 0) + counts.failed,
    })
    .eq("id", job_id)

  return res.json({
    status: "running",
    total: job.total,
    progress: newProgress,
    imported: (job.imported || 0) + counts.imported,
    skipped: (job.skipped || 0) + counts.skipped,
    failed: (job.failed || 0) + counts.failed,
  })
}
