import { handleSearch } from "#services/howlongtobeat/handlers/search.js"

const ACTIONS = {
  search: { handler: handleSearch, method: "GET", scopes: null, auth: false },
}

export async function howlongtobeatHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  return entry.handler(req, res)
}