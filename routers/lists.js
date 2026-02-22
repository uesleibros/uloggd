import { handleCreate } from "#services/lists/handlers/me/create.js"
import { handleDelete } from "#services/lists/handlers/me/delete.js"
import { handleUpdate } from "#services/lists/handlers/me/update.js"
import { handleGet } from "#services/lists/handlers/get.js"
import { handleAddItem } from "#services/lists/handlers/me/addItem.js"
import { handleRemoveItem } from "#services/lists/handlers/me/removeItem.js"
import { handleReorder } from "#services/lists/handlers/me/reorder.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create:     { handler: handleCreate,     scopes: ["@me"], auth: true },
  delete:     { handler: handleDelete,     scopes: ["@me"], auth: true },
  update:     { handler: handleUpdate,     scopes: ["@me"], auth: true },
  get:        { handler: handleGet,        scopes: null,    auth: false },
  addItem:    { handler: handleAddItem,    scopes: ["@me"], auth: true },
  removeItem: { handler: handleRemoveItem, scopes: ["@me"], auth: true },
  reorder:    { handler: handleReorder,    scopes: ["@me"], auth: true },
}

export async function listsHandler(req, res) {
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