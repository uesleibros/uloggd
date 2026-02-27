import { supabase } from "#lib/supabase-ssr.js"

export async function handleCreate(req, res) {
  const { title, description, isPublic = true } = req.body

  if (!title) return res.status(400).json({ error: "title required" })

  try {
    const { data, error } = await supabase
      .from("tierlists")
      .insert({
        user_id: req.user.id,
        title: title.slice(0, 100),
        description: description?.slice(0, 500) || null,
        is_public: isPublic,
      })
      .select()
      .single()

    if (error) throw error

    const defaultTiers = [
      { label: "S", color: "#ef4444", position: 0 },
      { label: "A", color: "#f97316", position: 1 },
      { label: "B", color: "#eab308", position: 2 },
      { label: "C", color: "#22c55e", position: 3 },
      { label: "D", color: "#3b82f6", position: 4 },
      { label: "F", color: "#8b5cf6", position: 5 },
    ]

    await supabase
      .from("tierlist_tiers")
      .insert(defaultTiers.map(t => ({ ...t, tierlist_id: data.id })))

    return res.json(data)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "fail" })
  }
}