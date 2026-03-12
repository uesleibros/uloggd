import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"

export async function handleSearch(req, res) {
	const { query: q, limit = 50, offset = 0, sort = "relevance" } = req.query
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
				limit 50;
				offset ${offsetNum};
			`),
			query("games/count", `where ${whereClause};`)
		])

		const input = q.toLowerCase().trim()
		const inputWords = input.split(/\s+/)

		const results = data.map(g => {
			const name = g.name.toLowerCase()
			const altNames = g.alternative_names?.map(a => a.name.toLowerCase()) || []
			const allNames = [name, ...altNames]

			let relevance = 0
			let matchedName = name

			for (const n of allNames) {
				let score = 0

				if (n === input) {
					score = 100
				} else if (n.startsWith(input)) {
					score = 80
				} else if (n.includes(input)) {
					score = 60
				} else {
					const matched = inputWords.filter(w => n.includes(w)).length
					score = (matched / inputWords.length) * 40
				}

				score -= n.length * 0.1

				if (score > relevance) {
					relevance = score
					matchedName = n
				}
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
				first_release_date: g.first_release_date,
				total_rating: g.total_rating,
				total_rating_count: g.total_rating_count,
				game_type: g.game_type,
				summary: g.summary,
				matchedAlt: matchedName !== name ? matchedName : null,
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
			.sort((a, b) => {
				if (sort === "relevance") return b.relevance - a.relevance
				return 0
			})
			.slice(0, limitNum)

		res.json({ results, total: countData?.count ?? results.length })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}