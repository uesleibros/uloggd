import { handleCreate } from "#services/lists/handlers/me/create.js"
import { handleDelete } from "#services/lists/handlers/me/delete.js"
import { handleUpdate } from "#services/lists/handlers/me/update.js"
import { handleGet } from "#services/lists/handlers/get.js"
import { handleAddItem } from "#services/lists/handlers/me/addItem.js"
import { handleRemoveItem } from "#services/lists/handlers/me/removeItem.js"
import { handleReorder } from "#services/lists/handlers/me/reorder.js"
import { handleSearch } from "#services/lists/handlers/search.js"
import { handleToggleMark } from "#services/lists/handlers/metoggleMark.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create:     { handler: handleCreate,     method: "POST", scopes: ["@me"], auth: true  },
  delete:     { handler: handleDelete,     method: "POST", scopes: ["@me"], auth: true  },
  update:     { handler: handleUpdate,     method: "POST", scopes: ["@me"], auth: true  },
  get:        { handler: handleGet,        method: "GET",  scopes: null,    auth: false },
  addItem:    { handler: handleAddItem,    method: "POST", scopes: ["@me"], auth: true  },
  removeItem: { handler: handleRemoveItem, method: "POST", scopes: ["@me"], auth: true  },
  reorder:    { handler: handleReorder,    method: "POST", scopes: ["@me"], auth: true  },
  toggleMark: { handler: handleToggleMark, method: "POST", scopes: ["@me"], auth: true  },
  search:     { handler: handleSearch,     method: "GET",  scopes: null,    auth: false },
}

export async function listsHandler(req, res) {
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