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

		const trophies = await fetchTrophiesWithFallback(
			accessToken,
			connection.provider_user_id,
			gameId,
			npServiceName
		)

		if (!trophies) {
			return res.json({ trophies: [], total: 0 })
		}

		res.json({ trophies, total: trophies.length })
	} catch (err) {
		console.error("Erro ao buscar troféus PSN:", err)
		res.status(500).json({ error: "Failed to fetch trophies" })
	}
}

async function fetchTrophiesWithFallback(accessToken, accountId, gameId, npServiceName) {
	let trophies = await fetchTrophies(accessToken, accountId, gameId, npServiceName)
	
	if (!trophies) {
		const altService = npServiceName === "trophy" ? "trophy2" : "trophy"
		trophies = await fetchTrophies(accessToken, accountId, gameId, altService)
	}
	
	return trophies
}

async function fetchTrophies(accessToken, accountId, gameId, npServiceName) {
	try {
		const [definitionsRes, userProgressRes, rarityRes] = await Promise.all([
			fetch(
				`${PSN_API_URL}/trophy/v1/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${npServiceName}`,
				{ headers: { Authorization: `Bearer ${accessToken}` } }
			),
			fetch(
				`${PSN_API_URL}/trophy/v1/users/${accountId}/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${npServiceName}`,
				{ headers: { Authorization: `Bearer ${accessToken}` } }
			),
			fetch(
				`${PSN_API_URL}/trophy/v1/npCommunicationIds/${gameId}/trophyGroups/all/trophies?npServiceName=${npServiceName}&visibleStats=true`,
				{ headers: { Authorization: `Bearer ${accessToken}` } }
			)
		])

		if (!definitionsRes.ok) return null

		const definitions = await definitionsRes.json()
		const userProgress = await userProgressRes.json()
		const rarityData = rarityRes.ok ? await rarityRes.json() : null

		return mergeTrophies(
			definitions.trophies || [],
			userProgress.trophies || [],
			rarityData?.trophies || []
		)
	} catch {
		return null
	}
}

function mergeTrophies(definitions, userProgress, rarityData) {
	const progressMap = new Map()
	const rarityMap = new Map()

	for (const trophy of userProgress) {
		progressMap.set(trophy.trophyId, trophy)
	}

	for (const trophy of rarityData) {
		rarityMap.set(trophy.trophyId, trophy)
	}

	return definitions.map(def => {
		const progress = progressMap.get(def.trophyId) || {}
		const rarity = rarityMap.get(def.trophyId) || {}

		const earnedRate = 
			rarity.trophyEarnedRate || 
			def.trophyEarnedRate || 
			progress.trophyEarnedRate || 
			null

		return {
			trophyId: def.trophyId,
			trophyName: def.trophyName,
			trophyDetail: def.trophyDetail,
			trophyType: def.trophyType,
			trophyIconUrl: def.trophyIconUrl,
			trophyHidden: def.trophyHidden || false,
			trophyGroupId: def.trophyGroupId || "default",
			trophyEarnedRate: earnedRate,
			trophyRare: rarity.trophyRare || def.trophyRare || 0,
			earned: progress.earned || false,
			earnedDateTime: progress.earnedDateTime || null,
			progress: progress.progress || null,
			progressRate: progress.progressRate || null
		}
	})
}
