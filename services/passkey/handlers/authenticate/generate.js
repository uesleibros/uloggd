import { generateAuthentication } from "#lib/passkey.js"

export async function handleAuthGenerate(req, res) {
  try {
    const options = await generateAuthentication()
    res.json(options)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}