import { supabase } from "#lib/supabase-ssr.js"

const MAX_TITLE = 100
const MAX_DESCRIPTION = 500
const MAX_LISTS = 50

export async function handleCreate(req, res) {
  const { title, description, isPublic, ranked } = req.body

  if (!title || typeof title !== "string")
    return res.status(400).json({ error: "missing title" })

  if (title.trim().length > MAX_TITLE)
    return res.status(400).json({ error: `title too long (max ${MAX_TITLE})` })

  const { count } = await supabase
    .from("lists")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.user.id)

  if (count >= MAX_LISTS)
    return res.status(400).json({ error: `max ${MAX_LISTS} lists` })

  try {
    const { data, error } = await supabase
      .from("lists")
      .insert({
        user_id: req.user.id,
        title: title.trim().slice(0, MAX_TITLE),
        description: description?.trim().slice(0, MAX_DESCRIPTION) || null,
        is_public: isPublic ?? true,
        ranked: ranked ?? true,
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}