import { handleStart } from "#services/backloggd/handlers/start.js"
import { handleStatus } from "#services/backloggd/handlers/status.js"
import { handleProcess } from "#services/backloggd/handlers/process.js"
import { handleCancel } from "#services/backloggd/handlers/cancel.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  start:   { handler: handleStart,   scopes: ["@me"], auth: true },
  status:  { handler: handleStatus,  scopes: ["@me"], auth: true },
  process: { handler: handleProcess, scopes: ["@me"], auth: true },
  cancel:  { handler: handleCancel,  scopes: ["@me"], auth: true },
}

export async function backloggdHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)

    if (!user) {
      return res.status(401).json({ error: "unauthorized" })
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "banned" })
    }

    req.user = user
  }

  return entry.handler(req, res)
}