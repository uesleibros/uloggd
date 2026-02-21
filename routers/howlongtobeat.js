import { handleSearch } from "#services/howlongtobeat/handlers/search.js"

const ACTIONS = {
  search: { handler: handleSearch, scopes: null, auth: false },
}

export async function howlongtobeatHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  return entry.handler(req, res)
}
