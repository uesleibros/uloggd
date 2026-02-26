import { handleRequest } from "#services/verification/handlers/request.js"
import { handleStatus } from "#services/verification/handlers/status.js"
import { handleReview } from "#services/verification/handlers/review.js"
import { handlePending } from "#services/verification/handlers/pending.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  request: { handler: handleRequest, method: "POST", auth: true },
  status:  { handler: handleStatus,  method: "GET",  auth: true },
  review:  { handler: handleReview,  method: "POST", auth: true },
  pending: { handler: handlePending, method: "GET",  auth: true },
}

export async function verificationHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

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