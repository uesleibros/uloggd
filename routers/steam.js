import { handleLogin } from "#services/steam/handlers/login.js"
import { handleCallback } from "#services/steam/handlers/callback.js"
import { handleStatus } from "#services/steam/handlers/status.js"
import { handleDisconnect } from "#services/steam/handlers/disconnect.js"
import { handlePresence } from "#services/steam/handlers/presence.js"
import { handleAchievements } from "#services/steam/handlers/achievements.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
	login:        { handler: handleLogin,          method: "POST", auth: true   },
	callback:     { handler: handleCallback,       method: "GET",  auth: false  },
	status:       { handler: handleStatus,         method: "POST", auth: false  },
	presence:     { handler: handlePresence,       method: "POST", auth: false  },
	achievements: { handler: handleAchievements,   method: "POST", auth: false  },
	disconnect:   { handler: handleDisconnect,	   method: "POST", auth: true	}
}

export async function steamHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method) return res.status(405).end()

	if (entry.auth) {
		const user = await getUser(req)
		if (!user) return res.status(401).json({ error: "unauthorized" })
		req.user = user
	}

	return entry.handler(req, res)
}

