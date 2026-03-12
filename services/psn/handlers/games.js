import * as psn from "psn-api"
import { supabase } from "#lib/supabase-ssr.js"

export async function handleGames(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data: connection, error } = await supabase
			.from("user_connections")
			.select("provider_user_id, access_token")
			.eq("user_id", userId)
			.eq("provider", "psn")
			.maybeSingle()

		if (error || !connection) {
			return res.status(401).json({ error: "PSN not connected" })
		}

		const response = await psn.getUserTitles(
			{ accessToken: connection.access_token },
			connection.provider_user_id,
			{ limit: 800 }
		)

		const games = response.trophyTitles.map(title => ({
			id: title.npCommunicationId,
			name: title.trophyTitleName,
			platform: title.trophyTitlePlatform,
			iconUrl: title.trophyTitleIconUrl,
			progress: title.progress,
			earnedTrophies: title.earnedTrophies,
			definedTrophies: title.definedTrophies,
			lastUpdated: title.lastUpdatedDateTime
		}))

		res.json({ games, total: response.totalResults })
	} catch (err) {
		console.error("Erro ao buscar jogos PSN:", err)
		res.status(500).json({ error: "Failed to fetch games" })
	}
}
