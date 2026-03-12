import { handleConnect } from "#services/psn/handlers/connect.js"
import { handleStatus } from "#services/psn/handlers/status.js"
import { handleDisconnect } from "#services/psn/handlers/disconnect.js"
import { handleGames } from "#services/psn/handlers/games.js"
import { handleTrophies } from "#services/psn/handlers/trophies.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
	connect:    { handler: handleConnect,    method: "POST", auth: true  },
	status:     { handler: handleStatus,     method: "POST", auth: false },
	disconnect: { handler: handleDisconnect, method: "POST", auth: true  },
	games:      { handler: handleGames,      method: "POST", auth: false },
	trophies:   { handler: handleTrophies,   method: "POST", auth: false }
}

export async function psnHandler(req, res) {
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
