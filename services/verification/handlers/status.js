import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
  const userId = req.user.id

  try {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("id, status, reason, rejection_reason, created_at, reviewed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    res.json({ request: data })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
