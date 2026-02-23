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
  create:      { handler: handleCreate,      scopes: ["@me"], auth: true  },
  delete:      { handler: handleDelete,      scopes: ["@me"], auth: true  },
  update:      { handler: handleUpdate,      scopes: ["@me"], auth: true  },
  like:        { handler: handleLike,        scopes: ["@me"], auth: true  },
  likeStatus:  { handler: handleLikeStatus,  scopes: null,    auth: false },
  likes:       { handler: handleLikes,       scopes: null,    auth: false },
  game:        { handler: handleGame,        scopes: ["@me"], auth: true  },
  public:      { handler: handlePublic,      scopes: null,    auth: false },
  stats:       { handler: handleStats,       scopes: null,    auth: false },
  user:        { handler: handleUser,        scopes: null,    auth: false },
  byUser:      { handler: handleByUser,      scopes: null,    auth: false },
}

export async function reviewsHandler(req, res) {
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
