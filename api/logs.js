import { handleCreate } from "../services/logs/handlers/create.js"
import { handleDelete } from "../services/logs/handlers/delete.js"
import { handleGame } from "../services/logs/handlers/game.js"
import { handlePublic } from "../services/logs/handlers/public.js"
import { handleStats } from "../services/logs/handlers/stats.js"
import { handleUpdate } from "../services/logs/handlers/update.js"
import { handleUser } from "../services/logs/handlers/user.js"
import { handleLike } from "../services/logs/handlers/like.js"
import { handleLikeStatus } from "../services/logs/handlers/likeStatus.js"
import { handleLikes } from "../services/logs/handlers/likes.js"

const ACTIONS = {
  create: handleCreate,
  delete: handleDelete,
  game: handleGame,
  public: handlePublic,
  stats: handleStats,
  update: handleUpdate,
  user: handleUser,
  like: handleLike,
  likeStatus: handkeLikeStatus,
  likes: handleLikes
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}
