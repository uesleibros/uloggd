import { supabase } from "#lib/supabase-ssr.js"

export async function handleDisconnect(req, res) {
	try {
		const { error } = await supabase
			.from("user_connections")
			.delete()
			.eq("user_id", user.id)
			.eq("provider", "steam")

		if (error) throw error

		res.json({ connected: false })
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "fail" })
	}
}
