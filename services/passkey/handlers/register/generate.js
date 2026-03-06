import { supabase } from "#lib/supabase-ssr.js"
import { generateRegistration } from "#lib/passkey.js"

export async function handleGenerate(req, res) {
  try {
    const { data: existingPasskeys } = await supabase
      .from("passkeys")
      .select("credential_id")
      .eq("user_id", req.user.id)

    const options = await generateRegistration(req.user.id, existingPasskeys || [])

    res.json(options)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}