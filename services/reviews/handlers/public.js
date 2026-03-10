import { supabase } from "#lib/supabase-ssr.js"
import {
	findManyByIds,
	resolveStreams,
	formatUserMap,
} from "#models/users/index.js"

export async function handlePublic(req, res) {
	const { gameId, sortBy = "recent", page = 1, limit = 20 } = req.query
	if (!gameId) return res.status(400).json({ error: "gameId required" })

	const pageNum = Number(page)
	const limitNum = Number(limit)
	const offset = (pageNum - 1) * limitNum

	try {
		let q = supabase
			.from("reviews")
			.select("*", { count: "exact" })
			.eq("game_id", gameId)
			.range(offset, offset + limitNum - 1)

		if (sortBy === "rating") {
			q = q
				.order("rating", { ascending: false, nullsFirst: false })
				.order("created_at", { ascending: false })
		} else {
			q = q.order("created_at", { ascending: false })
		}

		const { data: reviews, count, error } = await q
		if (error) throw error

		const userIds = [...new Set((reviews || []).map(r => r.user_id))]
		const journeyIds = [...new Set((reviews || []).map(r => r.journey_id).filter(Boolean))]

		let users = {}
		const journeys = {}

		if (userIds.length > 0) {
			const profiles = await findManyByIds(userIds)
			const streamsMap = await resolveStreams(profiles)
			users = formatUserMap(profiles, streamsMap)
		}

		if (journeyIds.length > 0) {
			const { data: journeysData } = await supabase
				.from("journeys")
				.select(`
					id,
					title,
					platform_id,
					created_at,
					journey_entries(id, played_on, hours, minutes)
				`)
				.in("id", journeyIds)

			journeysData?.forEach(journey => {
				const entries = journey.journey_entries || []
				const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)
				const sortedDates = entries.map(e => e.played_on).sort()

				journeys[journey.id] = {
					id: journey.id,
					title: journey.title,
					platform_id: journey.platform_id,
					total_sessions: entries.length,
					total_minutes: totalMinutes,
					first_session: sortedDates[0] || null,
					last_session: sortedDates[sortedDates.length - 1] || null,
				}
			})
		}

		res.json({
			reviews: reviews || [],
			users,
			journeys,
			total: count,
			page: pageNum,
			totalPages: Math.ceil((count || 0) / limitNum),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}