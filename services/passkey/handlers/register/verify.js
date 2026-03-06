import { supabase } from "#lib/supabase-ssr.js"
import { verifyRegistration } from "#lib/passkey.js"

export async function handleVerify(req, res) {
  const { response, deviceName = "Passkey" } = req.body

  if (!response) {
    return res.status(400).json({ error: "missing response" })
  }

  try {
    const registrationInfo = await verifyRegistration(req.user.id, response)

    const { credential } = registrationInfo

    if (!credential) {
      throw new Error("No credential returned")
    }

    const { data, error } = await supabase
      .from("passkeys")
      .insert({
        user_id: req.user.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        device_name: deviceName,
      })
      .select("id, device_name, created_at")
      .single()

    if (error) throw error

    res.json({ success: true, passkey: data })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || "fail" })
  }
}