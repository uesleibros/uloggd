import { supabase } from "#lib/supabase-ssr.js"
import twitchClient from "#lib/twitch.js"

export async function handleStatus(req, res) {
	const { userId } = req.body

	if (!userId) {
		return res.status(400).json({ error: "missing userId" })
	}

	try {
		const { data: connection } = await supabase
			.from("user_connections")
			.select("provider_username, provider_display_name, provider_avatar_url, connected_at")
			.eq("user_id", userId)
			.eq("provider", "twitch")
			.single()

		if (!connection) {
			return res.json({ connected: false })
		}

		let isLive = false
		let stream = null

		try {
			const streamData = await twitchClient.getStream(connection.provider_username)
			if (streamData) {
				isLive = true
				stream = {
					title: streamData.title,
					game: streamData.game_name,
					viewers: streamData.viewer_count,
					thumbnail: streamData.thumbnail_url.replace("{width}", "320").replace("{height}", "180")
				}
			}
		} catch {}

		res.json({
			connected: true,
			username: connection.provider_username,
			displayName: connection.provider_display_name,
			avatar: connection.provider_avatar_url,
			connectedAt: connection.connected_at,
			isLive,
			stream
		})
	} catch (err) {
		console.error("Status error:", err)
		res.status(500).json({ error: "fail" })
	}
}
