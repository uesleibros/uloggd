import { handleTranslate } from "#services/translate/handlers/translate.js"

const ACTIONS = {
	translate: { handler: handleTranslate, method: "POST", auth: false }
}

export async function translateHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method)
		return res.status(405).end()

	return entry.handler(req, res)
}