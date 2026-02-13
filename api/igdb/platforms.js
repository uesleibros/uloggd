import { query } from "../../lib/igdb-wrapper.js"

export default async function handler(req, res) {
  try {
    const data = await query("platforms", "fields *; limit 500;")
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}