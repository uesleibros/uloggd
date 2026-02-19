import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"

export async function handleStatus(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, status, source_username, total, progress, imported, skipped, failed, error, created_at, finished_at")
    .eq("user_id", user.id)
    .eq("source", "backloggd")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return res.json({ job: job || null })
}