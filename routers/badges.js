import { handleList } from "#services/badges/handlers/list.js"

const ACTIONS = {
  list: { handler: handleList, method: "GET", auth: false },
}

export async function badgesHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  return entry.handler(req, res)
}