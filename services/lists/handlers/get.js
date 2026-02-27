import { supabase } from "#lib/supabase-ssr.js"
import { decode } from "#utils/shortId.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleGet(req, res) {
	const { listId, userId, page = 1, limit = 24 } = req.query
	if (!listId && !userId) return res.status(400).json({ error: "missing listId or userId" })

	const pageNum = Number(page)
	const limitNum = Number(limit)
	const offset = (pageNum - 1) * limitNum

	try {
		if (listId) {
			const decodedId = decode(listId)
			if (!decodedId) return res.status(400).json({ error: "invalid listId" })

			const [listRes, itemsRes] = await Promise.all([
				supabase
					.from("lists")
					.select(`
						id, user_id, title, description, is_public, ranked, created_at, updated_at,
						owner:user_id ( id, username, avatar, avatar_decoration )
					`)
					.eq("id", decodedId)
					.single(),
				supabase
					.from("list_items")
					.select("id, game_id, game_slug, position, marked, note, added_at", { count: "exact" })
					.eq("list_id", decodedId)
					.order("position", { ascending: true })
					.range(offset, offset + limitNum - 1),
			])

			if (listRes.error?.code === "PGRST116") return res.status(404).json({ error: "list not found" })
			if (listRes.error) throw listRes.error
			if (itemsRes.error) throw itemsRes.error

			const list = listRes.data
			if (list.owner) {
				list.owner.avatar = list.owner.avatar || DEFAULT_AVATAR_URL
			}

			return res.json({
				...list,
				list_items: itemsRes.data || [],
				items_total: itemsRes.count || 0,
				items_page: pageNum,
				items_totalPages: Math.ceil((itemsRes.count || 0) / limitNum),
			})
		}

		const { data, error, count } = await supabase
			.from("lists")
			.select(`
				id, title, description, is_public, created_at, updated_at,
				list_items ( id, game_slug, position )
			`, { count: "exact" })
			.eq("user_id", userId)
			.order("created_at", { ascending: false })
			.range(offset, offset + limitNum - 1)

		if (error) throw error

		const lists = (data || []).map(list => {
			const items = (list.list_items || []).sort((a, b) => a.position - b.position)
			return {
				...list,
				games_count: items.length,
				game_slugs: items.slice(0, 4).map(i => i.game_slug),
			}
		})

		res.json({
			lists,
			total: count || 0,
			page: pageNum,
			totalPages: Math.ceil((count || 0) / limitNum),
		})
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}