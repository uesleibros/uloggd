import { query } from "#lib/igdbWrapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { scoreGame } from "#services/igdb/utils/scoreGame.js"

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

		const results = data.map(g => scoreGame(g, q))

		if (sort === "relevance") {
			results.sort((a, b) => b.relevance - a.relevance)
		}

		res.json({ results, total: countData?.count ?? results.length })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}