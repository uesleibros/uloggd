import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { reviewId } = req.body
  if (!reviewId) return res.status(400).json({ error: "reviewId required" })

  try {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
