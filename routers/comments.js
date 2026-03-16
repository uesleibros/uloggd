import { handleCreate } from "#services/comments/handlers/create.js"
import { handleList } from "#services/comments/handlers/list.js"
import { handleEdit } from "#services/comments/handlers/edit.js"
import { handleDelete } from "#services/comments/handlers/delete.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create: { handler: handleCreate, method: "POST", auth: true },
  list:   { handler: handleList,   method: "GET",  auth: false },
  edit:   { handler: handleEdit,   method: "POST", auth: true },
  delete: { handler: handleDelete, method: "POST", auth: true }
}

export async function commentsHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.auth) {
    const user = await getUser(req)

    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })

    req.user = user
  }

  return entry.handler(req, res)
}