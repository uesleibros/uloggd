import { supabase } from "#lib/supabase-ssr.js"

const PSN_API_URL = "https://m.np.playstation.com/api"

export async function handleTrophies(req, res) {
	const { userId, gameId } = req.body
	if (!userId || !gameId) {
		return res.status(400).json({ error: "userId and gameId required" })
	}

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

		const response = await fetch(
			`${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/npCommunicationIds/${gameId}/trophyGroups/all/trophies`,
			{
				headers: {
					Authorization: `Bearer ${connection.access_token}`
				}
			}
		)

		const data = await response.json()

		if (!response.ok) {
			throw new Error("Failed to fetch trophies")
		}

		const trophies = (data.trophies || []).map(trophy => ({
			id: trophy.trophyId,
			name: trophy.trophyName,
			description: trophy.trophyDetail,
			type: trophy.trophyType,
			iconUrl: trophy.trophyIconUrl,
			earned: trophy.earned,
			earnedAt: trophy.earnedDateTime,
			rarity: trophy.trophyEarnedRate
		}))

		res.json({ trophies, total: data.totalItemCount || trophies.length })
	} catch (err) {
		console.error("Erro ao buscar troféus PSN:", err)
		res.status(500).json({ error: "Failed to fetch trophies" })
	}
}
