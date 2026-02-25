import { getFollowStatus } from "#models/users/index.js"

export async function handleFollowStatus(req, res) {
	const { userId, currentUserId } = req.body
	if (!userId) return res.status(400).json({ error: "missing userId" })

	try {
		res.json(await getFollowStatus(userId, currentUserId))
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}