import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, status, source_username, total, progress, imported, skipped, failed, error, created_at, finished_at")
    .eq("user_id", req.user.id)
    .eq("source", "backloggd")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return res.json({ job: job || null })
}
