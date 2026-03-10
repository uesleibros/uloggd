import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { journeyId } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

  try {
    const { data: journey, error: fetchError } = await supabase
      .from("journeys")
      .select("id")
      .eq("id", journeyId)
      .eq("user_id", req.user.id)
      .single()

    if (fetchError || !journey)
      return res.status(404).json({ error: "journey not found" })

    const { error } = await supabase
      .from("journeys")
      .delete()
      .eq("id", journeyId)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
