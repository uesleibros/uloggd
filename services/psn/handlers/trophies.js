import { supabase } from "#lib/supabase-ssr.js"
import { getPsnToken } from "#services/psn/utils/psnAuth.js"

const PSN_API_URL = "https://m.np.playstation.com/api"

export async function handleTrophies(req, res) {
	const { userId, gameId } = req.body
	if (!userId || !gameId) {
		return res.status(400).json({ error: "userId and gameId required" })
	}

	try {
		const { data: connection, error } = await supabase
			.from("user_connections")
			.select("provider_user_id")
			.eq("user_id", userId)
			.eq("provider", "psn")
			.maybeSingle()

		if (error || !connection) {
			return res.status(401).json({ error: "PSN not connected", notConnected: true })
		}

		const accessToken = await getPsnToken(userId)

		const response = await fetch(
			`${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/npCommunicationIds/${gameId}/trophyGroups/all/trophies`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`
				}
			}
		)

		const data = await response.json()

		if (!response.ok) {
			console.error("PSN API error:", data)
			throw new Error("Failed to fetch trophies")
		}

		const trophies = (data.trophies || []).map(trophy => ({
			trophyId: trophy.trophyId,
			trophyName: trophy.trophyName,
			trophyDetail: trophy.trophyDetail,
			trophyType: trophy.trophyType,
			trophyIconUrl: trophy.trophyIconUrl,
			trophyHidden: trophy.trophyHidden || false,
			earned: trophy.earned || false,
			earnedDateTime: trophy.earnedDateTime || null,
			trophyEarnedRate: trophy.trophyEarnedRate || "0",
			trophyRare: trophy.trophyRare || 0,
			trophyGroupId: trophy.trophyGroupId || "default"
		}))

		res.json({ 
			trophies, 
			total: data.totalItemCount || trophies.length,
			notConnected: false 
		})
	} catch (err) {
		console.error("Erro ao buscar troféus PSN:", err)
		res.status(500).json({ error: "Failed to fetch trophies" })
	}
}
