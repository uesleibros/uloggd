import { VALID_LIST_TYPES } from "#services/users/constants.js"
import {
	getFollowIds,
	findManyByIds,
	resolveStreams,
	formatListProfile,
} from "#models/users/index.js"

export async function handleFollowers(req, res) {
	const { userId, type, page = 1, limit = 20 } = req.body
	if (!userId || !type) return res.status(400).json({ error: "missing params" })
	if (!VALID_LIST_TYPES.includes(type)) return res.status(400).json({ error: "invalid type" })

	const offset = (page - 1) * limit

	try {
		const { ids: userIds, total } = await getFollowIds(userId, type, { limit, offset })

		if (!userIds.length) {
			return res.json({
				users: [],
				total,
				page,
				totalPages: Math.ceil(total / limit),
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
			page,
			totalPages: Math.ceil(total / limit),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}