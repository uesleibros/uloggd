import { supabase } from "#lib/supabase-ssr.js"

export async function handleRemove(req, res) {
  const { passkeyId } = req.body

  if (!passkeyId) {
    return res.status(400).json({ error: "missing passkeyId" })
  }

  try {
    const { error } = await supabase
      .from("passkeys")
      .delete()
      .eq("id", passkeyId)
      .eq("user_id", req.user.id)

    if (error) throw error

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}