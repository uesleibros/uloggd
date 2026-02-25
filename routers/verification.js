import { handleRequest } from "#services/verification/handlers/request.js"
import { handleStatus } from "#services/verification/handlers/status.js"
import { handleReview } from "#services/verification/handlers/review.js"
import { handlePending } from "#services/verification/handlers/pending.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  request: { handler: handleRequest, auth: true },
  status:  { handler: handleStatus,  auth: true },
  review:  { handler: handleReview,  auth: true },
  pending: { handler: handlePending, auth: true },
}

export async function verificationHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    req.user = user
  }

  return entry.handler(req, res)
}
