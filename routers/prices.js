import { handleHistory } from "#services/prices/handlers/history.js"

const ACTIONS = {
  history: { handler: handleHistory, method: "GET", scopes: null, auth: false },
}

export async function pricesHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  return entry.handler(req, res)
}
