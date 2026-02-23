import { supabase } from "#lib/supabase-ssr.js"

function normalizeSwitchCode(code) {
	if (!code || typeof code !== "string") return null
	const cleaned = code.replace(/[^\d]/g, "")
	if (cleaned.length !== 12) return null
	return `SW-${cleaned.slice(0,4)}-${cleaned.slice(4,8)}-${cleaned.slice(8,12)}`
}

export async function handleConnect(req, res) {
	const { code } = req.body

	const formatted = normalizeSwitchCode(code)

	if (!formatted)
		return res.status(400).json({ error: "Código inválido" })

	const { error } = await supabase
		.from("user_connections")
		.upsert({
			user_id: req.user.id,
			provider: "nintendo",
			provider_user_id: formatted,
			provider_username: formatted,
		}, { onConflict: "user_id,provider" })

	if (error) {
		console.error(error)
		return res.status(500).json({ error: "fail" })
	}

	res.json({
		connected: true,
		code: formatted
	})
}