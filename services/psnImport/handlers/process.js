import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 25

const PLATFORM_MAP = {
  "PS5": 167,
  "PlayStation 5": 167,
  "PS4": 48,
  "PlayStation 4": 48,
  "PS3": 9,
  "PlayStation 3": 9,
  "PS Vita": 46,
  "PSVITA": 46,
  "PSP": 38,
}

function scoreMatch(psnGame, igdbGame) {
  const psnName = psnGame.name.toLowerCase()
  const igdbName = igdbGame.name.toLowerCase()

  let score = 0

  if (psnName === igdbName) score += 100
  if (psnName.includes(igdbName)) score += 40
  if (igdbName.includes(psnName)) score += 40

  if (igdbGame.alternative_names) {
    for (const alt of igdbGame.alternative_names) {
      const altName = alt.name.toLowerCase()
      if (psnName === altName) score += 80
      if (psnName.includes(altName)) score += 30
      if (altName.includes(psnName)) score += 30
    }
  }

  const expectedPlatform = PLATFORM_MAP[psnGame.platform]
  if (expectedPlatform && igdbGame.platforms?.some(p => p.id === expectedPlatform)) {
    score += 50
  }

  return score
}

export async function handleProcess(req, res) {
  const { job_id } = req.body
  if (!job_id) return res.status(400).json({ error: "missing job_id" })

  const { data: job } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", job_id)
    .eq("user_id", req.user.id)
    .single()

  if (!job || job.status !== "running") {
    return res.status(400).json({ error: "invalid job" })
  }

  const games = job.games_data || []
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

    return res.json({ status: "completed" })
  }

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const game of batch) {
    try {
      const results = await query("games", `
        fields id, slug, name, platforms.id, alternative_names.name;
        search "${game.name.replace(/"/g, "")}";
        where category = 0;
        limit 10;
      `)

      if (!results?.length) {
        skipped++
        continue
      }

      let best = null
      let bestScore = 0

      for (const igdbGame of results) {
        const score = scoreMatch(game, igdbGame)
        if (score > bestScore) {
          bestScore = score
          best = igdbGame
        }
      }

      if (!best || bestScore < 50) {
        skipped++
        continue
      }

      const hasProgress = game.progress > 0
      const isCompleted = game.progress === 100

      const row = {
        user_id: req.user.id,
        game_id: best.id,
        game_slug: best.slug,
        status: isCompleted ? "played" : (hasProgress ? "playing" : null),
        playing: hasProgress && !isCompleted,
        psn_np_communication_id: game.npCommunicationId,
      }

      const { error } = await supabase
        .from("user_games")
        .upsert(row, { onConflict: "user_id,game_id", ignoreDuplicates: true })

      if (error) {
        skipped++
      } else {
        imported++
      }
    } catch {
      failed++
    }
  }

  const newProgress = start + batch.length

  await supabase.from("import_jobs").update({
    progress: newProgress,
    imported: job.imported + imported,
    skipped: job.skipped + skipped,
    failed: job.failed + failed,
  }).eq("id", job_id)

  return res.json({
    status: "running",
    total: job.total,
    progress: newProgress,
    imported: job.imported + imported,
    skipped: job.skipped + skipped,
    failed: job.failed + failed,
  })
}
