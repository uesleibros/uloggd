import { supabase } from "#lib/supabase-ssr.js"
import {
	findManyByIds,
	resolveStreams,
	formatListProfile,
} from "#models/users/index.js"

export async function handleLikes(req, res) {
	const { reviewId, page = 1, limit = 20 } = req.body
	if (!reviewId) return res.status(400).json({ error: "missing reviewId" })

	const offset = (page - 1) * limit

	try {
		const { data, count } = await supabase
			.from("review_likes")
			.select("user_id", { count: "exact" })
			.eq("review_id", reviewId)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1)

		const userIds = data?.map(r => r.user_id) || []

		if (!userIds.length) {
			return res.json({
				users: [],
				total: count || 0,
				page,
				totalPages: Math.ceil((count || 0) / limit),
			})
		}

		const users = await findManyByIds(userIds)
		const streamsMap = await resolveStreams(users)

		const userMap = Object.fromEntries(users.map(u => [u.user_id, u]))

		const result = userIds
			.map(id => formatListProfile(userMap[id], { stream: streamsMap[id] }))
			.filter(Boolean)

		res.json({
			users: result,
			total: count || 0,
			page,
			totalPages: Math.ceil((count || 0) / limit),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}