import { supabase } from "#lib/supabase-ssr.js"

export async function handleEdit(req, res) {
  const { commentId, content } = req.body

  if (!commentId) return res.status(400).json({ error: "missing commentId" })
  if (!content?.trim()) return res.status(400).json({ error: "missing content" })
  if (content.trim().length > 2000) return res.status(400).json({ error: "content too long" })

  try {
    const { data: comment } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single()

    if (!comment) return res.status(404).json({ error: "comment not found" })
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: "forbidden" })

    const { error } = await supabase
      .from("comments")
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", commentId)

    if (error) throw error

    res.json({ updated: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}