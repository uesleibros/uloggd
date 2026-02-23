import { supabase } from "#lib/supabase-ssr.js"
import twitchClient from "#lib/twitch.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

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
		if (userIds.length === 0) return res.json([])

		const [profilesRes, badgesRes, connectionsRes] = await Promise.all([
			supabase
				.from("users")
				.select("user_id, username, avatar, is_moderator, avatar_decoration, last_seen, status")
				.in("user_id", userIds),
			supabase
				.from("user_badges")
				.select("user_id, assigned_at, badge:badges ( id, title, description, icon_url, color )")
				.in("user_id", userIds),
			supabase
				.from("user_connections")
				.select("user_id, provider_username")
				.eq("provider", "twitch")
				.in("user_id", userIds),
		])

		const profileMap = {}
		profilesRes.data?.forEach(p => { profileMap[p.user_id] = p })

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

		const twitchMap = {}
		const twitchUsernames = []

		connectionsRes.data?.forEach(c => {
			if (c.provider_username) {
				twitchMap[c.provider_username.toLowerCase()] = c.user_id
				twitchUsernames.push(c.provider_username)
			}
		})

		const streamsMap = {}

		if (twitchUsernames.length > 0) {
			try {
				const streams = await twitchClient.getStreams(twitchUsernames)
				streams.forEach(s => {
					const uid = twitchMap[s.user_login.toLowerCase()]
					if (uid) {
						streamsMap[uid] = {
							twitch_username: s.user_login,
							title: s.title,
							game: s.game_name,
							viewers: s.viewer_count,
							thumbnail: s.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
						}
					}
				})
			} catch {}
		}

		const result = userIds
			.map(id => {
				const prof = profileMap[id]
				if (!prof) return null

				return {
					id: prof.user_id,
					username: prof.username,
					avatar: prof.avatar || DEFAULT_AVATAR_URL,
					is_moderator: prof.is_moderator,
					avatar_decoration: prof.avatar_decoration,
					last_seen: prof.last_seen,
					status: prof.status,
					badges: badgesMap[id] || [],
					stream: streamsMap[id] || null,
				}
			})
			.filter(Boolean)

		res.json(result)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
