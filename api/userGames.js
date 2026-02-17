import { handleGet } from "../services/userGames/handlers/get.js"
import { handleUpdate } from "../services/userGames/handlers/update.js"
import { handleProfileGames } from "../services/userGames/handlers/profileGames.js"

const ACTIONS = {
  get: handleGet,
  update: handleUpdate,
  profileGames: handleProfileGames,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "action not found" })

  return fn(req, res)
}