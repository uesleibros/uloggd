import { VALID_LIST_TYPES } from "#services/users/constants.js"
import {
	getFollowIds,
	findManyByIds,
	resolveStreams,
	formatListProfile,
} from "#models/users/index.js"

export async function handleFollowers(req, res) {
	const { userId, type, page = 1, limit = 20 } = req.query

	if (!userId || !type) return res.status(400).json({ error: "missing params" })
	if (!VALID_LIST_TYPES.includes(type)) return res.status(400).json({ error: "invalid type" })

	const pageNum = Number(page)
	const limitNum = Number(limit)
	const offset = (pageNum - 1) * limitNum

	try {
		const { ids: userIds, total } = await getFollowIds(userId, type, { limit: limitNum, offset })

		if (!userIds.length) {
			return res.json({
				users: [],
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
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
			total,
			page: pageNum,
			totalPages: Math.ceil(total / limitNum),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}