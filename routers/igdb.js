import { handleAutocomplete } from "#services/igdb/handlers/autocomplete.js"
import { handleGame } from "#services/igdb/handlers/game.js"
import { handleGamesBatch } from "#services/igdb/handlers/gamesBatch.js"
import { handleUsersChoice } from "#services/igdb/handlers/usersChoice.js"
import { handleSearch } from "#services/igdb/handlers/search.js"

const ACTIONS = {
  autocomplete: { handler: handleAutocomplete, method: "GET",  scopes: null, auth: false },
  game:         { handler: handleGame,         method: "GET",  scopes: null, auth: false },
  gamesBatch:   { handler: handleGamesBatch,   method: "GET",  scopes: null, auth: false },
  search:       { handler: handleSearch,       method: "GET",  scopes: null, auth: false },
  usersChoice:  { handler: handleUsersChoice,  method: "GET",  scopes: null, auth: false },
}

export async function igdbHandler(req, res) {
  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action not found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid scope" })
  }

  return entry.handler(req, res)
}