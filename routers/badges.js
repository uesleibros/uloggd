import { handleList } from "#services/badges/handlers/list.js"

const ACTIONS = {
  list: { handler: handleList, auth: false },
}

export async function badgesHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  return entry.handler(req, res)
}
