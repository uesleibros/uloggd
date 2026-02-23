import { supabase } from "#lib/supabase-ssr.js"

export async function handleDisconnect(req, res) {
	const { error } = await supabase
		.from("user_connections")
		.delete()
		.eq("user_id", req.user.id)
		.eq("provider", "nintendo")

	if (error) {
		console.error(error)
		return res.status(500).json({ error: "fail" })
	}

	res.json({ success: true })
}