import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 25

async function processBatch(games, userId) {
  const npIds = games.map(g => g.npCommunicationId).filter(Boolean)
  
  if (npIds.length === 0) {
    return games.map(() => ({ status: "skipped" }))
  }

  const igdbGames = await query("games", `
    fields id, slug, external_games.uid;
    where external_games.uid = (${npIds.map(id => `"${id}"`).join(',')});
    limit 500;
  `)

  if (!igdbGames?.length) {
    return games.map(() => ({ status: "skipped" }))
  }

  const npToGame = {}
  for (const game of igdbGames) {
    if (game.external_games) {
      for (const ext of game.external_games) {
        if (npIds.includes(ext.uid)) {
          npToGame[ext.uid] = game
        }
      }
    }
  }

  const results = []

  for (const game of games) {
    const igdbGame = npToGame[game.npCommunicationId]

    if (!igdbGame) {
      results.push({ status: "skipped" })
      continue
    }

    const hasProgress = game.progress > 0
    const isCompleted = game.progress === 100

    const { error } = await supabase
      .from("user_games")
      .upsert({
        user_id: userId,
        game_id: igdbGame.id,
        game_slug: igdbGame.slug,
        status: isCompleted ? "played" : hasProgress ? "playing" : null,
        playing: hasProgress && !isCompleted
      }, { onConflict: "user_id,game_id" })

    results.push({ status: error ? "failed" : "imported" })
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
  const start = job.progress
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
	    imported: job.imported,
	    skipped: job.skipped,
	    failed: job.failed,
	  })
	}

  const results = await processBatch(batch, req.user.id)

  const counts = { imported: 0, skipped: 0, failed: 0 }
  for (const r of results) {
    counts[r.status]++
  }

  const newProgress = start + batch.length

  await supabase
    .from("import_jobs")
    .update({
      progress: newProgress,
      imported: job.imported + counts.imported,
      skipped: job.skipped + counts.skipped,
      failed: job.failed + counts.failed,
    })
    .eq("id", job_id)

  return res.json({
    status: "running",
    total: job.total,
    progress: newProgress,
    imported: job.imported + counts.imported,
    skipped: job.skipped + counts.skipped,
    failed: job.failed + counts.failed,
  })
}
