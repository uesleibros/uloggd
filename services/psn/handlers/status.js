import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data, error } = await supabase
			.from("user_connections")
			.select("provider_user_id, provider_display_name, provider_avatar_url, extra_data, token_expires_at")
			.eq("user_id", userId)
			.eq("provider", "psn")
			.maybeSingle()

		if (error) throw error

		if (data) {
			const isExpired = new Date(data.token_expires_at) < new Date()

			res.json({
				connected: !isExpired,
				accountId: data.provider_user_id,
				onlineId: data.provider_display_name,
				avatar: data.provider_avatar_url,
				isPlus: data.extra_data?.isPlus || false,
				expired: isExpired
			})
		} else {
			res.json({ connected: false })
		}
	} catch (err) {
		console.error("Erro no status da PSN:", err)
		res.json({ connected: false })
	}
}
