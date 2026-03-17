import { handleRatingStats } from "#services/stats/handlers/ratings.js"
import { handleLeaderboard } from "#services/stats/handlers/leaderboard.js"

const ACTIONS = {
  ratings:     { handler: handleRatingStats, method: "GET", scopes: null, auth: false },
  leaderboard: { handler: handleLeaderboard, method: "GET", scopes: null, auth: false },
}

export async function statsHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  return entry.handler(req, res)
}
