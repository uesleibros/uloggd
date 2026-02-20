import { handleNotificationCount } from "#services/notifications/handlers/count.js"
import { handleNotificationList } from "#services/notifications/handlers/list.js"
import { handleNotificationRead } from "#services/notifications/handlers/read.js"
import { handleNotificationDelete } from "#services/notifications/handlers/delete.js"

const ACTIONS = {
  count: handleNotificationCount,
  list: handleNotificationList,
  read: handleNotificationRead,
  delete: handleNotificationDelete,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}
