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

		const npServiceName = gameId.startsWith("NPWR") ? "trophy" : "trophy2"

		const [definitionsRes, userProgressRes] = await Promise.all([
			fetch(
				`${PSN_API_URL}/trophy/v1/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${npServiceName}`,
				{
					headers: { Authorization: `Bearer ${accessToken}` }
				}
			),
			fetch(
				`${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${npServiceName}`,
				{
					headers: { Authorization: `Bearer ${accessToken}` }
				}
			)
		])

		const definitions = await definitionsRes.json()
		const userProgress = await userProgressRes.json()

		if (!definitionsRes.ok) {
			const altNpServiceName = npServiceName === "trophy" ? "trophy2" : "trophy"
			
			const [altDefinitionsRes, altUserProgressRes] = await Promise.all([
				fetch(
					`${PSN_API_URL}/trophy/v1/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${altNpServiceName}`,
					{
						headers: { Authorization: `Bearer ${accessToken}` }
					}
				),
				fetch(
					`${PSN_API_URL}/trophy/v1/users/${connection.provider_user_id}/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${altNpServiceName}`,
					{
						headers: { Authorization: `Bearer ${accessToken}` }
					}
				)
			])

			const altDefinitions = await altDefinitionsRes.json()
			const altUserProgress = await altUserProgressRes.json()

			if (!altDefinitionsRes.ok) {
				return res.json({ trophies: [], total: 0 })
			}

			const trophies = mergeTrophies(altDefinitions.trophies, altUserProgress.trophies)
			return res.json({ trophies, total: altDefinitions.totalItemCount || trophies.length })
		}

		const trophies = mergeTrophies(definitions.trophies, userProgress.trophies)
		res.json({ trophies, total: definitions.totalItemCount || trophies.length })
	} catch (err) {
		console.error("Erro ao buscar troféus PSN:", err)
		res.status(500).json({ error: "Failed to fetch trophies" })
	}
}

function mergeTrophies(definitions = [], userProgress = []) {
	const progressMap = new Map()
	
	for (const trophy of userProgress) {
		progressMap.set(trophy.trophyId, trophy)
	}

	return definitions.map(def => {
		const progress = progressMap.get(def.trophyId) || {}
		
		return {
			trophyId: def.trophyId,
			trophyName: def.trophyName,
			trophyDetail: def.trophyDetail,
			trophyType: def.trophyType,
			trophyIconUrl: def.trophyIconUrl,
			trophyHidden: def.trophyHidden || false,
			trophyGroupId: def.trophyGroupId || "default",
			trophyEarnedRate: def.trophyEarnedRate || "0",
			trophyRare: def.trophyRare || 0,
			earned: progress.earned || false,
			earnedDateTime: progress.earnedDateTime || null,
			progress: progress.progress || null,
			progressRate: progress.progressRate || null
		}
	})
}
