import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data, error } = await supabase
			.from("user_connections")
			.select("provider_username, provider_display_name") 
			.eq("user_id", userId)
			.eq("provider", "nintendo")
			.maybeSingle()

		if (error) throw error

		if (data) {
			res.json({ 
				connected: true, 
				code: data.provider_username, 
				nickname: data.provider_display_name 
			})
		} else {
			res.json({ connected: false })
		}
	} catch (err) {
		console.error("Erro no status da Nintendo:", err) 
		res.json({ connected: false })
	}
}