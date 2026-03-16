import { handleConnect } from "#services/retroachievements/handlers/connect.js"
import { handleStatus } from "#services/retroachievements/handlers/status.js"
import { handleDisconnect } from "#services/retroachievements/handlers/disconnect.js"
import { handleGame } from "#services/retroachievements/handlers/game.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  connect:    { handler: handleConnect,    method: "POST", auth: true  },
  status:     { handler: handleStatus,     method: "POST", auth: false },
  disconnect: { handler: handleDisconnect, method: "POST", auth: true  },
  game:       { handler: handleGame,       method: "GET",  auth: false },
}

export async function retroachievementsHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

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
