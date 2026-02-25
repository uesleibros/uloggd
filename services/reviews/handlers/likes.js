import { supabase } from "#lib/supabase-ssr.js"
import {
	findManyByIds,
	resolveStreams,
	formatListProfile,
} from "#models/users/index.js"

export async function handleLikes(req, res) {
	const { reviewId } = req.body
	if (!reviewId) return res.status(400).json({ error: "missing reviewId" })

	try {
		const { data } = await supabase
			.from("review_likes")
			.select("user_id")
			.eq("review_id", reviewId)
			.order("created_at", { ascending: false })

		const userIds = data?.map(r => r.user_id) || []
		if (!userIds.length) return res.json([])

		const users = await findManyByIds(userIds)
		const streamsMap = await resolveStreams(users)

		const userMap = Object.fromEntries(users.map(u => [u.user_id, u]))

		const result = userIds
			.map(id => formatListProfile(userMap[id], { stream: streamsMap[id] }))
			.filter(Boolean)

		res.json(result)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}