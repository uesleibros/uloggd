import { handleCreate } from "#services/journeys/handlers/me/create.js"
import { handleDelete } from "#services/journeys/handlers/me/delete.js"
import { handleUpdate } from "#services/journeys/handlers/me/update.js"
import { handleList } from "#services/journeys/handlers/me/list.js"
import { handleGet } from "#services/journeys/handlers/get.js"
import { handleAddEntry } from "#services/journeys/handlers/entries/add.js"
import { handleUpdateEntry } from "#services/journeys/handlers/entries/update.js"
import { handleRemoveEntry } from "#services/journeys/handlers/entries/remove.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create:       { handler: handleCreate,       method: "POST", scopes: ["@me"], auth: true },
  delete:       { handler: handleDelete,       method: "POST", scopes: ["@me"], auth: true },
  update:       { handler: handleUpdate,       method: "POST", scopes: ["@me"], auth: true },
  list:         { handler: handleList,         method: "GET",  scopes: ["@me"], auth: true },
  get:          { handler: handleGet,          method: "GET",  scopes: null,    auth: false },
  addEntry:     { handler: handleAddEntry,     method: "POST", scopes: ["@me"], auth: true },
  updateEntry:  { handler: handleUpdateEntry,  method: "POST", scopes: ["@me"], auth: true },
  removeEntry:  { handler: handleRemoveEntry,  method: "POST", scopes: ["@me"], auth: true },
}

export async function journeysHandler(req, res) {
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
