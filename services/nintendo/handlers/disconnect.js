import { supabase } from "#lib/supabase-ssr.js"

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

	res.json({ disconnected: true })
}
