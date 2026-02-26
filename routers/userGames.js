import { handleGet } from "#services/userGames/handlers/me/get.js"
import { handleUpdate } from "#services/userGames/handlers/me/update.js"
import { handleProfileGames } from "#services/userGames/handlers/profileGames.js"
import { handleLibrary } from "#services/userGames/handlers/me/library.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  get:          { handler: handleGet,          method: "GET",  scopes: ["@me"], auth: true  },
  update:       { handler: handleUpdate,       method: "POST", scopes: ["@me"], auth: true  },
  profileGames: { handler: handleProfileGames, method: "GET",  scopes: null,    auth: false },
  library:      { handler: handleLibrary,      method: "GET",  scopes: ["@me"], auth: true  },
}

export async function userGamesHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

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