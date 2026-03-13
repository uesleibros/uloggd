import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 25

async function processBatch(games, userId) {
  const npIds = games.map(g => g.npCommunicationId).filter(Boolean)
  
  console.log("=== BATCH DEBUG ===")
  console.log("Games in batch:", games.map(g => ({ name: g.name, npId: g.npCommunicationId })))
  console.log("NP IDs count:", npIds.length)
  
  if (npIds.length === 0) {
    console.log("❌ No NP IDs found, skipping all")
    return games.map(() => ({ status: "skipped" }))
  }

  const igdbQuery = `
    fields id, slug, name, external_games.uid, external_games.category;
    where external_games.uid = (${npIds.map(id => `"${id}"`).join(',')});
    limit 500;
  `
  console.log("IGDB Query:", igdbQuery)

  const igdbGames = await query("games", igdbQuery)

  console.log("IGDB returned:", igdbGames?.length || 0, "games")
  if (igdbGames?.length) {
    console.log("IGDB games:", igdbGames.map(g => ({ 
      name: g.name, 
      id: g.id,
      externals: g.external_games?.map(e => e.uid)
    })))
  }

  if (!igdbGames?.length) {
    console.log("❌ No IGDB matches, skipping all")
    return games.map(() => ({ status: "skipped" }))
  }

  const npToGame = {}
  for (const game of igdbGames) {
    if (game.external_games) {
      for (const ext of game.external_games) {
        if (npIds.includes(ext.uid)) {
          npToGame[ext.uid] = game
          console.log(`✅ Mapped: ${ext.uid} -> ${game.name}`)
        }
      }
    }
  }

  console.log("Mappings found:", Object.keys(npToGame).length)

  const results = []

  for (const game of games) {
    const igdbGame = npToGame[game.npCommunicationId]

    if (!igdbGame) {
      console.log(`⏭️ Skip (no match): ${game.name}`)
      results.push({ status: "skipped" })
      continue
    }

    const hasProgress = game.progress > 0
    const isCompleted = game.progress === 100

    console.log(`📥 Importing: ${game.name} -> ${igdbGame.slug} (progress: ${game.progress}%)`)

    const { error } = await supabase
      .from("user_games")
      .upsert({
        user_id: userId,
        game_id: igdbGame.id,
        game_slug: igdbGame.slug,
        status: isCompleted ? "played" : hasProgress ? "playing" : null,
        playing: hasProgress && !isCompleted
      }, { onConflict: "user_id,game_id" })

    if (error) {
      console.log(`❌ DB Error: ${error.message}`)
      results.push({ status: "failed" })
    } else {
      console.log(`✅ Imported: ${game.name}`)
      results.push({ status: "imported" })
    }
  }

  console.log("=== BATCH RESULTS ===", results)
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

  console.log(`\n🎮 Processing job ${job_id}: ${start}/${job.total}`)

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
