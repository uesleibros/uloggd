import {
	findManyByIds,
	resolveStreams,
	formatListProfile,
} from "#models/users/index.js"

export async function handleBatch(req, res) {
	const { userIds } = req.body
	if (!userIds?.length) return res.json([])

	try {
		const users = await findManyByIds(userIds)
		const streamsMap = await resolveStreams(users)

		const result = users.map(u =>
			formatListProfile(u, { stream: streamsMap[u.user_id] })
		)

		res.json(result)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}