import { decode } from "#utils/shortId.js"
import {
	findByUserId,
	findByUsername,
	getProfileCounts,
	resolveStream,
	formatFullProfile,
} from "#models/users/index.js"

export async function handleProfile(req, res) {
	const { userId, username } = req.body
	if (!userId && !username)
		return res.status(400).json({ error: "missing userId or username" })

	try {
		const profile = userId
			? await findByUserId(decode(userId))
			: await findByUsername(username)

		if (!profile)
			return res.status(404).json({ error: "user not found" })

		const [counts, stream] = await Promise.all([
			getProfileCounts(profile.user_id),
			resolveStream(profile.user_connections),
		])

		res.json(formatFullProfile(profile, { stream, counts }))
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}