import { supabase } from "#lib/supabase-ssr.js"

export async function handleCancel(req, res) {
  const { job_id } = req.body
  if (!job_id) return res.status(400).json({ error: "missing job_id" })

  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, status")
    .eq("id", job_id)
    .eq("user_id", req.user.id)
    .single()

  if (!job) return res.status(404).json({ error: "job not found" })
  if (job.status !== "running" && job.status !== "scraping") {
    return res.status(400).json({ error: "job not running" })
  }

  await supabase
    .from("import_jobs")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
      games_data: null,
    })
    .eq("id", job_id)

  return res.json({ cancelled: true })
}
