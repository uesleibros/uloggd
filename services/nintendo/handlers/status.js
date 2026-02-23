import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data } = await supabase
			.from("user_connections")
			.select("provider_username, display_name")
			.eq("user_id", userId)
			.eq("provider", "nintendo")
			.single()

		if (data) {
			res.json({ connected: true, code: data.provider_username, nickname: data.display_name })
		} else {
			res.json({ connected: false })
		}
	} catch {
		res.json({ connected: false })
	}
}