import { supabase } from "#lib/supabase-ssr.js"

export async function handleReorder(req, res) {
  const { screenshotIds } = req.body

  if (!Array.isArray(screenshotIds) || screenshotIds.length === 0) {
    return res.status(400).json({ error: "screenshotIds required" })
  }

  try {
    const updates = screenshotIds.map((id, index) =>
      supabase
        .from("screenshots")
        .update({ position: index })
        .eq("id", id)
        .eq("user_id", req.user.id)
    )

    await Promise.all(updates)

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}