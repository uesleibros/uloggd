import { supabase } from "#lib/supabase-ssr.js"
import twitchClient from "#lib/twitch.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

const SEARCH_SELECT = `
	user_id, username, avatar, bio, is_moderator, avatar_decoration,
	status, last_seen, created_at,
	user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) ),
	user_connections ( provider, provider_username )
`

export async function handleSearch(req, res) {
	const { query, limit = 20, offset = 0, sort = "relevance" } = req.body

	if (!query?.trim()) return res.json({ results: [], total: 0 })

	try {
		let q = supabase
			.from("users")
			.select(SEARCH_SELECT, { count: "exact" })
			.ilike("username", `%${query}%`)

		if (sort === "username") q = q.order("username", { ascending: true })
		else if (sort === "newest") q = q.order("created_at", { ascending: false })
		else q = q.order("username", { ascending: true })

		const { data, count, error } = await q.range(offset, offset + limit - 1)

		if (error) throw error

		const twitchMap = {}
		const twitchUsernames = []

		;(data || []).forEach(u => {
			const twitch = u.user_connections?.find(c => c.provider === "twitch")
			if (twitch?.provider_username) {
				twitchMap[twitch.provider_username.toLowerCase()] = u.user_id
				twitchUsernames.push(twitch.provider_username)
			}
		})

		const streamsMap = {}

		if (twitchUsernames.length > 0) {
			try {
				const streams = await twitchClient.getStreams(twitchUsernames)
				streams.forEach(s => {
					const userId = twitchMap[s.user_login.toLowerCase()]
					if (userId) {
						streamsMap[userId] = {
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

		const results = (data || []).map(u => ({
			id: u.user_id,
			username: u.username,
			avatar: u.avatar || DEFAULT_AVATAR_URL,
			bio: u.bio,
			status: u.status,
			last_seen: u.last_seen,
			is_moderator: u.is_moderator,
			avatar_decoration: u.avatar_decoration,
			created_at: u.created_at,
			badges: u.user_badges?.map(ub => ({
				...ub.badge,
				assigned_at: ub.assigned_at,
			})) || [],
			stream: streamsMap[u.user_id] || null,
		}))

		res.json({ results, total: count || 0 })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
