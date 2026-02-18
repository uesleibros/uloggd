import { handleProfile } from "../services/user/handlers/profile.js"
import { handleBio } from "../services/user/handlers/bio.js"
import { handleDelete } from "../services/user/handlers/delete.js"
import { handleFollow } from "../services/user/handlers/follow.js"
import { handleFollowStatus } from "../services/user/handlers/followStatus.js"
import { handleFollowers } from "../services/user/handlers/followers.js"
import { handleBanner } from "../services/user/handlers/banner.js"
import { handleThinking } from "../services/user/handlers/thinking.js"
import { handleBorder } from "../services/user/handlers/border.js"

const ACTIONS = {
  profile: handleProfile,
  bio: handleBio,
  delete: handleDelete,
  follow: handleFollow,
  followStatus: handleFollowStatus,
  followers: handleFollowers,
  banner: handleBanner,
  thinking: handleThinking,
  border: handleBorder
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "action not found" })

  return fn(req, res)
}
