import { supabase } from "#lib/supabase-ssr.js"
import { clearVerificationState } from "#services/nintendo/utils/rateLimiter.js"

export async function handleDisconnect(req, res) {
	const userId = req.user.id

	const { error } = await supabase
		.from("user_connections")
		.delete()
		.eq("user_id", userId)
		.eq("provider", "nintendo")

	if (error) {
		console.error(error)
		return res.status(500).json({ error: "fail" })
	}

	clearVerificationState(userId)
	res.json({ disconnected: true })
}
