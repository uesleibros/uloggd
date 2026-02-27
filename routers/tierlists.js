import { handleCreate } from "#services/tierlists/handlers/me/create.js"
import { handleDelete } from "#services/tierlists/handlers/me/delete.js"
import { handleUpdate } from "#services/tierlists/handlers/me/update.js"
import { handleGet } from "#services/tierlists/handlers/get.js"
import { handleList } from "#services/tierlists/handlers/list.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create: { handler: handleCreate, method: "POST", scopes: ["@me"], auth: true  },
  delete: { handler: handleDelete, method: "POST", scopes: ["@me"], auth: true  },
  update: { handler: handleUpdate, method: "POST", scopes: ["@me"], auth: true  },
  get:    { handler: handleGet,    method: "GET",  scopes: null,    auth: false },
  list:   { handler: handleList,   method: "GET",  scopes: null,    auth: false },
}

export async function tierlistsHandler(req, res) {
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