import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import { scrapeUser, verifyUser } from "../scraper.js"

export async function handleStart(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { username } = req.body
  if (!username || typeof username !== "string" || username.length > 50) {
    return res.status(400).json({ error: "invalid username" })
  }

  const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, "")
  if (!cleanUsername) return res.status(400).json({ error: "invalid username" })

  const { data: existing } = await supabase
    .from("import_jobs")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["scraping", "running"])
    .maybeSingle()

  if (existing) {
    return res.status(409).json({ error: "import already running", job_id: existing.id })
  }

  const userExists = await verifyUser(cleanUsername)
  if (!userExists) {
    return res.status(404).json({ error: "backloggd user not found" })
  }

  const { data: job, error: createError } = await supabase
    .from("import_jobs")
    .insert({
      user_id: user.id,
      source: "backloggd",
      source_username: cleanUsername,
      status: "scraping",
    })
    .select("id")
    .single()

  if (createError) {
    console.error(createError)
    return res.status(500).json({ error: "failed to create job" })
  }

  try {
    const games = await scrapeUser(cleanUsername)

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
        error: e.message || "scraping failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    return res.status(500).json({ error: "scraping failed", job_id: job.id })
  }
}