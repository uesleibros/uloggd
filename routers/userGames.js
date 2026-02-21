import { handleGet } from "#services/userGames/handlers/get.js"
import { handleUpdate } from "#services/userGames/handlers/update.js"
import { handleProfileGames } from "#services/userGames/handlers/profileGames.js"
import { handleMyGames } from "#services/userGames/handlers/myGames.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  get:          { handler: handleGet,          scopes: null,     auth: false },
  update:       { handler: handleUpdate,       scopes: ["@me"],  auth: true },
  profileGames: { handler: handleProfileGames, scopes: null,     auth: false },
  myGames:      { handler: handleMyGames,      scopes: ["@me"],  auth: true },
}

export async function userGamesHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  }

  return entry.handler(req, res)
}
