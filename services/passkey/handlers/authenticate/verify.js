import { supabase } from "#lib/supabase-ssr.js"
import { verifyAuthentication } from "#lib/passkey.js"

export async function handleAuthVerify(req, res) {
  const { response, authId } = req.body

  if (!response || !authId) {
    return res.status(400).json({ error: "missing data" })
  }

  try {
    const credentialId = response.id

    const { data: passkey, error: pkError } = await supabase
      .from("passkeys")
      .select("*")
      .eq("credential_id", credentialId)
      .single()

    if (pkError || !passkey) {
      return res.status(401).json({ error: "passkey not found" })
    }

    const authInfo = await verifyAuthentication(authId, response, passkey)

    await supabase
      .from("passkeys")
      .update({
        counter: authInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", passkey.id)

    const { data, error } = await supabase.auth.admin.createSession({
      userId: passkey.user_id
    })

    if (error) throw error

    res.json({
      success: true,
      session: data.session,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || "fail" })
  }
}