import { handleGet } from "#services/userGames/handlers/me/get.js"
import { handleUpdate } from "#services/userGames/handlers/me/update.js"
import { handleProfileGames } from "#services/userGames/handlers/profileGames.js"
import { handleLibrary } from "#services/userGames/handlers/me/library.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  get:          { handler: handleGet,          scopes: ["@me"],  auth: true },
  update:       { handler: handleUpdate,       scopes: ["@me"],  auth: true },
  profileGames: { handler: handleProfileGames, scopes: null,     auth: false },
  library:      { handler: handleLibrary,      scopes: ["@me"],  auth: true },
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