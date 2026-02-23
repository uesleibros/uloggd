import { supabase } from "#lib/supabase-ssr.js"
import { encode } from "#utils/shortId.js"

export async function handleSearch(req, res) {
	const { query, limit = 20, offset = 0, sort = "relevance" } = req.body

	if (!query?.trim()) return res.json({ results: [], total: 0 })

	try {
		let q = supabase
			.from("lists")
			.select(`
				id, title, description, is_public, created_at,
				owner:user_id ( username, avatar ),
				list_items ( id )
			`, { count: "exact" })
			.eq("is_public", true)
			.ilike("title", `%${query}%`)

		if (sort === "title") q = q.order("title", { ascending: true })
		else if (sort === "newest") q = q.order("created_at", { ascending: false })
		else q = q.order("created_at", { ascending: false })

		const { data, count, error } = await q.range(offset, offset + limit - 1)

		if (error) throw error

		const results = (data || []).map(list => ({
			id: list.id,
			shortId: encode(list.id),
			title: list.title,
			description: list.description,
			games_count: list.list_items?.length || 0,
			owner: list.owner,
			created_at: list.created_at,
		}))

		if (sort === "games_count") {
			results.sort((a, b) => b.games_count - a.games_count)
		}

		res.json({ results, total: count || 0 })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}