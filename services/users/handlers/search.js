import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

const SEARCH_SELECT = `
	user_id, username, avatar, bio, is_moderator, avatar_decoration,
	status, last_seen, created_at,
	user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) )
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
		}))

		res.json({ results, total: count || 0 })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}