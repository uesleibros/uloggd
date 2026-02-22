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
import { getUser } from "#lib/auth.js"
import { supabase } from "#lib/supabase-ssr.js"

const ACTIONS = {
  profile:      { handler: handleProfile,      scopes: null,       auth: false    },
  username:     { handler: handleUsername,     scopes: ["@me"],    auth: true     },
  bio:          { handler: handleBio,          scopes: ["@me"],    auth: true     },
  delete:       { handler: handleDelete,       scopes: ["@me"],    auth: true     },
  follow:       { handler: handleFollow,       scopes: null,       auth: true     },
  followStatus: { handler: handleFollowStatus, scopes: null,       auth: false    },
  followers:    { handler: handleFollowers,    scopes: null,       auth: false    },
  banner:       { handler: handleBanner,       scopes: ["@me"],    auth: true     },
  avatar:       { handler: handleAvatar,       scopes: ["@me"],    auth: true     },
  thinking:     { handler: handleThinking,     scopes: ["@me"],    auth: true     },
  decoration:   { handler: handleDecoration,   scopes: ["@me"],    auth: true     },
  pronoun:      { handler: handlePronoun,      scopes: ["@me"],    auth: true     },
  heartbeat:    { handler: handleHeartbeat,    scopes: ["@me"],    auth: "flexible" },
  batch:        { handler: handleBatch,        scopes: null,       auth: false    },
}

export async function usersHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  if (entry.auth === true) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  } else if (entry.auth === "flexible") {
    let user = await getUser(req)
    if (!user && req.body?._authToken) {
      const { data, error } = await supabase.auth.getUser(req.body._authToken)
      if (!error && data?.user) user = data.user
    }
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  }

  return entry.handler(req, res)
}
