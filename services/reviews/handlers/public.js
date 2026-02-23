import { supabase } from "#lib/supabase-ssr.js"
import twitchClient from "#lib/twitch.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

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
		const users = {}

		if (userIds.length > 0) {
			const [profilesRes, badgesRes, connectionsRes] = await Promise.all([
				supabase
					.from("users")
					.select("user_id, username, avatar, avatar_decoration, last_seen, status")
					.in("user_id", userIds),
				supabase
					.from("user_badges")
					.select("user_id, assigned_at, badge:badges(id, title, description, icon_url, color)")
					.in("user_id", userIds),
				supabase
					.from("user_connections")
					.select("user_id, provider_username")
					.eq("provider", "twitch")
					.in("user_id", userIds),
			])

			const badgesMap = {}
			badgesRes.data?.forEach(row => {
				if (!badgesMap[row.user_id]) badgesMap[row.user_id] = []
				if (row.badge) {
					badgesMap[row.user_id].push({
						...row.badge,
						assigned_at: row.assigned_at,
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
								thumbnail: s.thumbnail_url
									.replace("{width}", "320")
									.replace("{height}", "180"),
							}
						}
					})
				} catch {}
			}

			profilesRes.data?.forEach(prof => {
				users[prof.user_id] = {
					username: prof.username,
					avatar: prof.avatar || DEFAULT_AVATAR_URL,
					avatar_decoration: prof.avatar_decoration || null,
					last_seen: prof.last_seen,
					status: prof.status,
					badges: badgesMap[prof.user_id] || [],
					stream: streamsMap[prof.user_id] || null,
				}
			})
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
