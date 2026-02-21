import { usersHandler } from "#routers/users.js"
import { userGamesHandler } from "#routers/userGames.js"
import { backloggdHandler } from "#routers/backloggd.js"

const SERVICES = {
  users: usersHandler,
  userGames: userGamesHandler,
  backloggd: backloggdHandler
}

export default async function handler(req, res) {
  const { service, action, scope } = req.query

  const fn = SERVICES[service]
  if (!fn) return res.status(404).json({ error: "service not found" })

  req.action = action
  req.scope = scope ?? null

  return fn(req, res)
}
