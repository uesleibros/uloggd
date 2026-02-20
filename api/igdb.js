import { handleAutocomplete } from "#services/igdb/handlers/autocomplete.js"
import { handleGame } from "#services/igdb/handlers/game.js"
import { handleGamesBatch } from "#services/igdb/handlers/gamesBatch.js"
import { handleUsersChoice } from "#services/igdb/handlers/usersChoice.js"

const ACTIONS = {
  autocomplete: handleAutocomplete,
  game: handleGame,
  gamesBatch: handleGamesBatch,
  usersChoice: handleUsersChoice,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}