import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#utils/auth.js"

const BATCH_SIZE = 25

export async function handleProcess(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { job_id } = req.body
  if (!job_id) return res.status(400).json({ error: "missing job_id" })

  const { data: job, error: fetchError } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !job) return res.status(404).json({ error: "job not found" })
  if (job.status === "cancelled") return res.json({ ...job, games_data: undefined })
  if (job.status !== "running") return res.json({ ...job, games_data: undefined })

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

    return res.json({
      status: "completed",
      total: job.total,
      progress: job.progress,
      imported: job.imported,
      skipped: job.skipped,
      failed: job.failed,
      source_username: job.source_username,
      finished_at: new Date().toISOString(),
    })
  }

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const game of batch) {
    try {
      const row = {
        user_id: user.id,
        game_id: game.game_id,
        game_slug: game.slug,
        status: game.played ? "played" : null,
        playing: game.playing || false,
        backlog: game.backlog || false,
        wishlist: game.wishlist || false,
      }

      const { error } = await supabase
        .from("user_games")
        .upsert(row, { onConflict: "user_id,game_id", ignoreDuplicates: true })

      if (error) {
        if (error.code === "23505") {
          skipped++
        } else {
          failed++
        }
      } else {
        imported++
      }
    } catch {
      failed++
    }
  }

  const newProgress = start + batch.length
  const isComplete = newProgress >= games.length

  const update = {
    progress: newProgress,
    imported: job.imported + imported,
    skipped: job.skipped + skipped,
    failed: job.failed + failed,
  }

  if (isComplete) {
    update.status = "completed"
    update.finished_at = new Date().toISOString()
    update.games_data = null
  }

  await supabase.from("import_jobs").update(update).eq("id", job_id)

  return res.json({
    status: update.status || "running",
    total: job.total,
    progress: newProgress,
    imported: update.imported,
    skipped: update.skipped,
    failed: update.failed,
    source_username: job.source_username,
    finished_at: update.finished_at || null,
  })
}