import { supabase } from "#lib/supabase-ssr.js"

export async function handleDisconnect(req, res) {
	try {
		const { error } = await supabase
			.from("user_connections")
			.delete()
			.eq("user_id", req.user.id)
			.eq("provider", "twitch")

		if (error) throw error

		res.json({ success: true })
	} catch (err) {
		console.error("Disconnect error:", err)
		res.status(500).json({ error: "fail" })
	}
}
