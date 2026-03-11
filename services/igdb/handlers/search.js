import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"

function scoreText(text, input) {
	const t = text.toLowerCase().trim()
	if (t === input) return 100
	if (t.startsWith(input)) return 85
	if (t.includes(input)) return 65
	const words = input.split(/\s+/)
	const matched = words.filter(w => t.includes(w)).length
	return (matched / words.length) * 40
}

export async function handleSearch(req, res) {
	const { query: q, limit = 20, offset = 0, sort = "relevance" } = req.query
	if (!q?.trim()) return res.status(400).json({ results: [], total: 0 })

	try {
		const nameFilter = buildNameFilter(q)
		const altNameFilter = nameFilter.replace(/\bname\b/g, "alternative_names.name")
		const whereClause = `(${nameFilter} | ${altNameFilter})`

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
					alternative_names.name,
					total_rating, total_rating_count, game_type,
					summary;
				where ${whereClause};
				sort ${orderBy};
				limit ${limitNum};
				offset ${offsetNum};
			`),
			query("games/count", `where ${whereClause};`)
		])

		const input = q.toLowerCase().trim()

		const results = data.map(g => {
			const titleScore = scoreText(g.name, input)

			let bestAltScore = 0
			if (g.alternative_names?.length) {
				for (const alt of g.alternative_names) {
					const s = scoreText(alt.name, input)
					if (s > bestAltScore) bestAltScore = s
				}
			}

			let relevance = titleScore > 0
				? 1000 + titleScore
				: bestAltScore * 0.5

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