import { supabase } from "#lib/supabase-ssr.js"

export async function handleList(req, res) {
  try {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    res.json({ badges: data || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
