import { supabase } from "#lib/supabase-ssr.js"
import { getPsnToken } from "#services/psn/utils/psnAuth.js"

const PSN_API_URL = "https://m.np.playstation.com/api"

export async function handleGames(req, res) {
	const { userId } = req.body
	if (!userId) return res.status(400).json({ error: "userId required" })

	try {
		const { data: connection, error } = await supabase
			.from("user_connections")
			.select("provider_user_id")
			.eq("user_id", userId)
			.eq("provider", "psn")
			.maybeSingle()

		if (error || !connection) {
			return res.status(401).json({ error: "PSN not connected" })
		}

		const accessToken = await getPsnToken(userId)

		const response = await fetch(
			`${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/trophyTitles?limit=800`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		)

		const data = await response.json()

		if (!response.ok) {
			throw new Error("Failed to fetch games")
		}

		const games = (data.trophyTitles || []).map(title => ({
			id: title.npCommunicationId,
			name: title.trophyTitleName,
			platform: title.trophyTitlePlatform,
			iconUrl: title.trophyTitleIconUrl,
			progress: title.progress,
			earnedTrophies: title.earnedTrophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
			definedTrophies: title.definedTrophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
			lastUpdated: title.lastUpdatedDateTime
		}))

		res.json({ games, total: data.totalItemCount || games.length })
	} catch (err) {
		console.error("Erro ao buscar jogos PSN:", err)
		res.status(500).json({ error: "Failed to fetch games" })
	}
}
