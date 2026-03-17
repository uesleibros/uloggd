import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { screenshotId } = req.body

  if (!screenshotId) return res.status(400).json({ error: "screenshotId required" })

  try {
    const { error } = await supabase
      .from("screenshots")
      .delete()
      .eq("id", screenshotId)
      .eq("user_id", req.user.id)

    if (error) throw error

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}