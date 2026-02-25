import { supabase } from "#lib/supabase-ssr.js"
import {
	findManyByIds,
	resolveStreams,
	formatUserMap,
} from "#models/users/index.js"

export async function handlePublic(req, res) {
	const { gameId, sortBy = "recent", page = 1, limit = 20 } = req.body
	if (!gameId) return res.status(400).json({ error: "gameId required" })

	const offset = (page - 1) * limit

	try {
		let q = supabase
			.from("reviews")
			.select("*", { count: "exact" })
			.eq("game_id", gameId)
			.range(offset, offset + limit - 1)

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
		let users = {}

		if (userIds.length > 0) {
			const profiles = await findManyByIds(userIds)
			const streamsMap = await resolveStreams(profiles)
			users = formatUserMap(profiles, streamsMap)
		}

		res.json({
			reviews: reviews || [],
			users,
			total: count,
			page,
			totalPages: Math.ceil((count || 0) / limit),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}