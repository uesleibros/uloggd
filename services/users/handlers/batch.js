import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleBatch(req, res) {
	const { userIds } = req.body

	if (!userIds?.length) return res.json([])

	try {
		const [profilesRes, badgesRes] = await Promise.all([
			supabase
				.from("users")
				.select("user_id, username, avatar, is_moderator, avatar_decoration, last_seen, status")
				.in("user_id", userIds),
			supabase
				.from("user_badges")
				.select("user_id, assigned_at, badge:badges ( id, title, description, icon_url, color )")
				.in("user_id", userIds),
		])

		const badgesMap = {}
		badgesRes.data?.forEach(ub => {
			if (!badgesMap[ub.user_id]) badgesMap[ub.user_id] = []
			if (ub.badge) {
				badgesMap[ub.user_id].push({
					...ub.badge,
					assigned_at: ub.assigned_at,
				})
			}
		})

		const result = (profilesRes.data || [])
			.map(prof => ({
				id: prof.user_id,
				username: prof.username,
				avatar: prof.avatar || DEFAULT_AVATAR_URL,
				is_moderator: prof.is_moderator,
				avatar_decoration: prof.avatar_decoration,
				last_seen: prof.last_seen,
				status: prof.status,
				badges: badgesMap[prof.user_id] || [],
			}))

		res.json(result)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}