import { supabase } from "#lib/supabase-ssr.js"

export async function handleDisconnect(req, res) {
	try {
		const authHeader = req.headers.authorization
		
		if (!authHeader) {
			return res.status(401).json({ error: "Unauthorized" })
		}
		
		const token = authHeader.replace("Bearer ", "")

		const { data: { user }, error: authError } = await supabase.auth.getUser(token)
		
		if (authError || !user) {
			return res.status(401).json({ error: "Unauthorized" })
		}

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