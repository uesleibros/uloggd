import { handleProfile } from "#services/users/handlers/profile.js"
import { handleBio } from "#services/users/handlers/me/bio.js"
import { handleDelete } from "#services/users/handlers/me/delete.js"
import { handleFollow } from "#services/users/handlers/follow.js"
import { handleFollowStatus } from "#services/users/handlers/followStatus.js"
import { handleFollowers } from "#services/users/handlers/followers.js"
import { handleBanner } from "#services/users/handlers/me/banner.js"
import { handleAvatar } from "#services/users/handlers/me/avatar.js"
import { handleThinking } from "#services/users/handlers/me/thinking.js"
import { handleDecoration } from "#services/users/handlers/me/decoration.js"
import { handlePronoun } from "#services/users/handlers/me/pronoun.js"
import { handleHeartbeat } from "#services/users/handlers/me/heartbeat.js"
import { handleUsername } from "#services/users/handlers/me/username.js"
import { handleBatch } from "#services/users/handlers/batch.js"
import { handleSearch } from "#services/users/handlers/search.js"
import { getUser } from "#lib/auth.js"
import { supabase } from "#lib/supabase-ssr.js"
import { ensureUserNotBanned } from "#lib/moderation.js"

const ACTIONS = {
  profile:      { handler: handleProfile,      method: "GET",  scopes: null,    auth: false      },
  username:     { handler: handleUsername,     method: "POST", scopes: ["@me"], auth: true       },
  bio:          { handler: handleBio,          method: "POST", scopes: ["@me"], auth: true       },
  delete:       { handler: handleDelete,       method: "POST", scopes: ["@me"], auth: true       },
  follow:       { handler: handleFollow,       method: "POST", scopes: null,    auth: true       },
  followStatus: { handler: handleFollowStatus, method: "GET",  scopes: null,    auth: false      },
  followers:    { handler: handleFollowers,    method: "GET",  scopes: null,    auth: false      },
  banner:       { handler: handleBanner,       method: "POST", scopes: ["@me"], auth: true       },
  avatar:       { handler: handleAvatar,       method: "POST", scopes: ["@me"], auth: true       },
  thinking:     { handler: handleThinking,     method: "POST", scopes: ["@me"], auth: true       },
  decoration:   { handler: handleDecoration,   method: "POST", scopes: ["@me"], auth: true       },
  pronoun:      { handler: handlePronoun,      method: "POST", scopes: ["@me"], auth: true       },
  heartbeat:    { handler: handleHeartbeat,    method: "POST", scopes: ["@me"], auth: "flexible" },
  batch:        { handler: handleBatch,        method: "POST", scopes: null,    auth: false      },
  search:       { handler: handleSearch,       method: "GET",  scopes: null,    auth: false      }
}

export async function usersHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  let user = null

  if (entry.auth === true) {
    user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  } else if (entry.auth === "flexible") {
    user = await getUser(req)
    if (!user && req.body?._authToken) {
      const { data, error } = await supabase.auth.getUser(req.body._authToken)
      if (!error && data?.user) user = data.user
    }
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  }

  const writeActions = [
    "follow",
    "bio",
    "delete",
    "banner",
    "avatar",
    "thinking",
    "decoration",
    "pronoun",
    "username"
  ]

  if (writeActions.includes(req.action)) {
    try {
      const targetId =
        req.body?.userId ||
        req.body?.followingId ||
        req.body?.targetUserId

      if (targetId) {
        await ensureUserNotBanned(targetId)
      }
    } catch (e) {
      if (e.message === "target_banned") {
        return res.status(400).json({ error: "cannot interact with banned user" })
      }
      return res.status(500).json({ error: "fail" })
    }
  }

  return entry.handler(req, res)
}