import { handleGenerate } from "#services/passkey/handlers/register/generate.js"
import { handleVerify } from "#services/passkey/handlers/register/verify.js"
import { handleAuthGenerate } from "#services/passkey/handlers/authenticate/generate.js"
import { handleAuthVerify } from "#services/passkey/handlers/authenticate/verify.js"
import { handleList } from "#services/passkey/handlers/list.js"
import { handleRemove } from "#services/passkey/handlers/remove.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  "register-generate": { handler: handleGenerate,     method: "POST", auth: true  },
  "register-verify":   { handler: handleVerify,       method: "POST", auth: true  },
  "auth-generate":     { handler: handleAuthGenerate, method: "POST", auth: false },
  "auth-verify":       { handler: handleAuthVerify,   method: "POST", auth: false },
  "list":              { handler: handleList,         method: "GET",  auth: true  },
  "remove":            { handler: handleRemove,       method: "POST", auth: true  },
}

export async function passkeyHandler(req, res) {
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