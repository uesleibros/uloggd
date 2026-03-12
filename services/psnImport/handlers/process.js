import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 25

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

  const searchNames = batch.map(g => `"${g.name}"`).join(",")

  const igdbResults = await query("games", `
    fields id, slug, name;
    where name = (${searchNames});
    limit ${batch.length};
  `)

  const igdbMap = new Map()
  for (const g of igdbResults) {
    igdbMap.set(g.name.toLowerCase(), g)
  }

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const game of batch) {
    try {
      const igdbGame = igdbMap.get(game.name.toLowerCase())

      if (!igdbGame) {
        skipped++
        continue
      }

      const hasProgress = game.progress > 0
      const isCompleted = game.progress === 100

      const row = {
        user_id: req.user.id,
        game_id: igdbGame.id,
        game_slug: igdbGame.slug,
        status: isCompleted ? "played" : (hasProgress ? "playing" : null),
        playing: hasProgress && !isCompleted,
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
