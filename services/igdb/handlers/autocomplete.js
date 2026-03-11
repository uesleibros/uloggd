import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { buildNameFilter } from "#services/igdb/utils/buildNameFilter.js"
import { scoreGame } from "#services/igdb/utils/scoreGame.js"

export async function handleAutocomplete(req, res) {
	const { query: q } = req.query
	if (!q?.trim()) return res.status(400).json({ error: "missing query" })

	try {
		const nameFilter = buildNameFilter(q)
		const data = await query("games", `
			fields name, slug, first_release_date,
				cover.url, cover.image_id,
				platforms.id, platforms.name, platforms.abbreviation,
				alternative_names.name,
				total_rating, total_rating_count, game_type;
			where ${nameFilter} & cover != null;
			sort total_rating_count desc;
			limit 30;
		`)

		const games = data
			.map(g => scoreGame(g, q))
			.sort((a, b) => b.relevance - a.relevance)

		res.json(games)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}