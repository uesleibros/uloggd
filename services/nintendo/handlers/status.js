import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
	const { userId } = req.body

	if (!userId)
		return res.status(400).json({ error: "missing userId" })

	const { data } = await supabase
		.from("user_connections")
		.select("provider_username")
		.eq("user_id", userId)
		.eq("provider", "nintendo")
		.maybeSingle()

	if (!data)
		return res.json({ connected: false })

	res.json({
		connected: true,
		code: data.provider_username
	})
}