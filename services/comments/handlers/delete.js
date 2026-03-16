import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { commentId } = req.body

  if (!commentId) return res.status(400).json({ error: "missing commentId" })

  try {
    const { data: comment } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single()

    if (!comment) return res.status(404).json({ error: "comment not found" })

    if (comment.user_id !== req.user.id && !req.user.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)

    if (error) throw error

    res.json({ deleted: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}