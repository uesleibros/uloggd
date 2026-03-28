import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ connected: false })

	const { data } = await supabase
		.from("user_connections")
		.select("*")
		.eq("user_id", userId)
		.eq("provider", "nintendo")
		.single()

	if (!data) return res.json({ connected: false })

	const extra = typeof data.extra_data === "string"
		? JSON.parse(data.extra_data || "{}")
		: data.extra_data || {}

	res.json({
		connected: true,
		code: data.provider_user_id,
		nickname: data.provider_display_name,
		avatar: data.provider_avatar_url,
		nsaId: extra.nsaId || null,
	})
}
