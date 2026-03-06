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

    const { data: authUser } = await supabase.auth.admin.getUserById(passkey.user_id)

    if (!authUser?.user?.email) {
      return res.status(500).json({ error: "user not found" })
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
    })

    if (error) throw error

    const tokenHash = data.properties.hashed_token

    res.json({
      success: true,
      tokenHash,
      email: authUser.user.email,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || "fail" })
  }
}