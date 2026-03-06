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

    await supabase.auth.admin.signOut(passkey.user_id, "global")

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
      options: {
        redirectTo: process.env.APP_URL
      }
    })

    if (linkError) throw linkError

    const url = new URL(linkData.properties.action_link)
    const token = url.searchParams.get("token")
    const type = url.searchParams.get("type")

    res.json({
      success: true,
      token,
      type,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || "fail" })
  }
}