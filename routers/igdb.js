import { handleAutocomplete } from "#services/igdb/handlers/autocomplete.js"
import { handleGame } from "#services/igdb/handlers/game.js"
import { handleGamesBatch } from "#services/igdb/handlers/gamesBatch.js"
import { handleUsersChoice } from "#services/igdb/handlers/usersChoice.js"

const ACTIONS = {
  autocomplete: { handler: handleAutocomplete, scopes: null, auth: false },
  game:         { handler: handleGame,         scopes: null, auth: false },
  gamesBatch:   { handler: handleGamesBatch,   scopes: null, auth: false },
  usersChoice:  { handler: handleUsersChoice,  scopes: null, auth: false },
}

export async function igdbHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  return entry.handler(req, res)
}
