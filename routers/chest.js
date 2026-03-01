import { handleStatus } from "#services/chest/handlers/status.js"
import { handleOpen } from "#services/chest/handlers/open.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  status: { handler: handleStatus, method: "GET", scopes: ["@me"], auth: true },
  open: { handler: handleOpen, method: "POST", scopes: ["@me"], auth: true },
}

export async function chestHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  }

  return entry.handler(req, res)
}