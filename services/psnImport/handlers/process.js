import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 20

async function findGamesByPsnIds(npIds) {
  if (!npIds.length) return {}

  const results = await query("external_games", `
    fields game.id, game.slug, game.name, uid;
    where uid = (${npIds.map(id => `"${id}"`).join(",")});
    limit 500;
  `)

  const map = {}
  for (const ext of results || []) {
    if (ext.game) map[ext.uid] = ext.game
  }
  return map
}

async function findGameByName(name) {
  const results = await query("games", `
    search "${name.replace(/"/g, '\\"')}";
    fields id, slug, name;
    limit 1;
  `)
  return results?.[0] || null
}

async function processBatch(games, userId) {
  const npIds = games.map(g => g.npCommunicationId).filter(Boolean)
  const psnMap = await findGamesByPsnIds(npIds)

  const igdbResults = await Promise.all(
    games.map(g => psnMap[g.npCommunicationId] || findGameByName(g.name))
  )

  const validIds = igdbResults.filter(Boolean).map(g => g.id)
  if (!validIds.length) return games.map(() => ({ status: "skipped" }))

  const { data: existing } = await supabase
    .from("user_games")
    .select("game_id")
    .eq("user_id", userId)
    .in("game_id", validIds)

  const existingIds = new Set(existing?.map(g => g.game_id) || [])

  const results = []
  const toInsert = []

  for (let i = 0; i < games.length; i++) {
    const game = games[i]
    const igdb = igdbResults[i]

    if (!igdb || existingIds.has(igdb.id)) {
      results.push({ status: "skipped" })
      continue
    }

    toInsert.push({
      user_id: userId,
      game_id: igdb.id,
      game_slug: igdb.slug,
      status: game.progress === 100 ? "completed" : "played",
      playing: game.progress > 0 && game.progress < 100
    })
    results.push({ status: "imported" })
  }

  if (toInsert.length) {
    const { error } = await supabase.from("user_games").insert(toInsert)
    if (error) return results.map(r => r.status === "imported" ? { status: "failed" } : r)
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

  if (!batch.length) {
    await supabase
      .from("import_jobs")
      .update({ status: "completed", finished_at: new Date().toISOString(), games_data: null })
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
  results.forEach(r => counts[r.status]++)

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
    ...counts
  })
}
