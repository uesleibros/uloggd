import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data, error } = await supabase
			.from("user_connections")
			.select("provider_username, provider_display_name, provider_avatar_url")
			.eq("user_id", userId)
			.eq("provider", "steam")
			.maybeSingle()

		if (error) throw error

		if (data) {
			res.json({ 
				connected: true, 
				steamId: data.provider_username, 
				nickname: data.provider_display_name,
				avatar: data.provider_avatar_url
			})
		} else {
			res.json({ connected: false })
		}
	} catch (err) {
		console.error("Erro no status da Steam:", err)
		res.json({ connected: false })
	}
}