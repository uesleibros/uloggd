import { handleConnect } from "#services/nintendo/handlers/connect.js"
import { handleDisconnect } from "#services/nintendo/handlers/disconnect.js"
import { handleStatus } from "#services/nintendo/handlers/status.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
	connect:    { handler: handleConnect,    method: "POST", auth: true  },
	disconnect: { handler: handleDisconnect, method: "POST", auth: true  },
	status:     { handler: handleStatus,     method: "POST", auth: false }
}

export async function nintendoHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method)
		return res.status(405).end()

	if (entry.auth) {
		const user = await getUser(req)
		if (!user) return res.status(401).json({ error: "unauthorized" })
		req.user = user
	}

	return entry.handler(req, res)
}