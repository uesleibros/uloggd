import { handleCreate } from "#services/reviews/handlers/me/create.js"
import { handleDelete } from "#services/reviews/handlers/me/delete.js"
import { handleGame } from "#services/reviews/handlers/me/game.js"
import { handlePublic } from "#services/reviews/handlers/public.js"
import { handleStats } from "#services/reviews/handlers/stats.js"
import { handleUpdate } from "#services/reviews/handlers/me/update.js"
import { handleUser } from "#services/reviews/handlers/user.js"
import { handleLike } from "#services/reviews/handlers/like.js"
import { handleLikeStatus } from "#services/reviews/handlers/likeStatus.js"
import { handleLikes } from "#services/reviews/handlers/likes.js"
import { handleByUser } from "#services/reviews/handlers/byUser.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  create:      { handler: handleCreate,      method: "POST", scopes: ["@me"], auth: true  },
  delete:      { handler: handleDelete,      method: "POST", scopes: ["@me"], auth: true  },
  update:      { handler: handleUpdate,      method: "POST", scopes: ["@me"], auth: true  },
  like:        { handler: handleLike,        method: "POST", scopes: ["@me"], auth: true  },
  likeStatus:  { handler: handleLikeStatus,  method: "GET",  scopes: null,    auth: false },
  likes:       { handler: handleLikes,       method: "GET",  scopes: null,    auth: false },
  game:        { handler: handleGame,        method: "GET",  scopes: ["@me"], auth: true  },
  public:      { handler: handlePublic,      method: "GET",  scopes: null,    auth: false },
  stats:       { handler: handleStats,       method: "GET",  scopes: null,    auth: false },
  user:        { handler: handleUser,        method: "GET",  scopes: null,    auth: false },
  byUser:      { handler: handleByUser,      method: "GET",  scopes: null,    auth: false },
}

export async function reviewsHandler(req, res) {
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