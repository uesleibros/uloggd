import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"

export async function handleSearch(req, res) {
	const { query: q, limit = 20, offset = 0, sort = "relevance" } = req.query
	if (!q?.trim()) return res.status(400).json({ results: [], total: 0 })

	try {
		const nameFilter = buildNameFilter(q)
		
		const limitNum = Math.min(Number(limit), 50)
		const offsetNum = Number(offset)
		
		let orderBy = "total_rating_count desc"
		if (sort === "name") orderBy = "name asc"
		else if (sort === "newest") orderBy = "first_release_date desc"
		else if (sort === "rating") orderBy = "total_rating desc"

		const [data, countData] = await Promise.all([
			query("games", `
				fields name, slug, first_release_date,
					cover.url, cover.image_id,
					platforms.id, platforms.name, platforms.abbreviation,
					total_rating, total_rating_count, game_type,
					summary;
				where ${nameFilter};
				sort ${orderBy};
				limit ${limitNum};
				offset ${offsetNum};
			`),
			query("games/count", `where ${nameFilter};`)
		])

		const input = q.toLowerCase().trim()

		const results = data.map(g => {
			const name = g.name.toLowerCase()
			let relevance = 0

			if (name === input) relevance = 100
			else if (name.startsWith(input)) relevance = 80
			else if (name.includes(input)) relevance = 60
			else {
				const inputWords = input.split(/\s+/)
				const matched = inputWords.filter(w => name.includes(w)).length
				relevance = (matched / inputWords.length) * 40
			}

			relevance += Math.min((g.total_rating_count || 0) / 100, 20)

			const slugs = new Set()
			g.platforms?.forEach(p => {
				const slug = PLATFORMS_MAP[String(p.id)]
				if (slug) slugs.add(slug)
			})

			return {
				id: g.id,
				name: g.name,
				slug: g.slug,
				summary: g.summary,
				first_release_date: g.first_release_date,
				total_rating: g.total_rating,
				total_rating_count: g.total_rating_count,
				relevance,
				platformIcons: [...slugs].sort().map(slug => ({
					name: slug,
					icon: `/platforms/result/${slug}.png`
				})),
				cover: g.cover?.url
					? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
					: null
			}
		})

		if (sort === "relevance") {
			results.sort((a, b) => b.relevance - a.relevance)
		}

		const total = countData?.count ?? results.length

		res.json({ results, total })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}