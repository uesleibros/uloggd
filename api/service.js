import { usersHandler } from "#routers/users.js"
import { userGamesHandler } from "#routers/userGames.js"
import { backloggdHandler } from "#routers/backloggd.js"
import { notificationsHandler } from "#routers/notifications.js"
import { howlongtobeatHandler } from "#routers/howlongtobeat.js"
import { igdbHandler } from "#routers/igdb.js"
import { reviewsHandler } from "#routers/reviews.js"
import { listsHandler } from "#routers/lists.js"

const SERVICES = {
  users: usersHandler,
  userGames: userGamesHandler,
  backloggd: backloggdHandler,
  notifications: notificationsHandler,
  howlongtobeat: howlongtobeatHandler,
  igdb: igdbHandler,
  reviews: reviewsHandler,
  lists: listsHandler
}

export default async function handler(req, res) {
  const { service, action, scope } = req.query

  const fn = SERVICES[service]
  if (!fn) return res.status(404).json({ error: "service not found" })

  req.action = action
  req.scope = scope ?? null

  return fn(req, res)
}
