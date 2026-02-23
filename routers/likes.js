import { handleByUser } from "#services/likes/handlers/byUser.js"

const ACTIONS = {
	byUser: { handler: handleByUser, method: "POST", auth: false }
}

export async function likesHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method)
		return res.status(405).end()

	return entry.handler(req, res)
}