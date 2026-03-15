import { handleByUser } from "#services/likes/handlers/byUser.js"
import { handleToggle } from "#services/likes/handlers/toggle.js"
import { handleStatus } from "#services/likes/handlers/status.js"
import { handleUsers } from "#services/likes/handlers/users.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
	byUser: { handler: handleByUser, method: "GET", auth: false },
	toggle: { handler: handleToggle, method: "POST", auth: true },
	status: { handler: handleStatus, method: "GET", auth: false },
	users:  { handler: handleUsers,  method: "GET", auth: false }
}

export async function likesHandler(req, res) {
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