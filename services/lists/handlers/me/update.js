import { supabase } from "#lib/supabase-ssr.js"

const MAX_TITLE = 100
const MAX_DESCRIPTION = 500

export async function handleUpdate(req, res) {
  const { listId, title, description, isPublic, ranked } = req.body
  if (!listId) return res.status(400).json({ error: "missing listId" })

  const updateData = {}

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim())
      return res.status(400).json({ error: "invalid title" })
    updateData.title = title.trim().slice(0, MAX_TITLE)
  }

  if (description !== undefined) {
    updateData.description = description?.trim().slice(0, MAX_DESCRIPTION) || null
  }

  if (isPublic !== undefined) {
    updateData.is_public = !!isPublic
  }

  if (ranked !== undefined) {
    updateData.ranked = !!ranked
  }

  if (Object.keys(updateData).length === 0)
    return res.status(400).json({ error: "nothing to update" })

  updateData.updated_at = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from("lists")
      .update(updateData)
      .eq("id", listId)
      .eq("user_id", req.user.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: "list not found" })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}