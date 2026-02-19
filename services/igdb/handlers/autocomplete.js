import { query } from "../../../lib/igdb-wrapper.js"
import { PLATFORMS_MAP } from "../../../data/platformsMapper.js"
import { buildNameFilter } from "../utils/buildNameFilter.js"

export async function handleAutocomplete(req, res) {
	const { query: q } = req.body
	if (!q?.trim()) return res.status(400).json({ error: "missing query" })

	try {
		const nameFilter = buildNameFilter(q)
		const data = await query("games", `
			fields name, slug, first_release_date,
				cover.url, cover.image_id,
				platforms.id, platforms.name, platforms.abbreviation,
				total_rating, total_rating_count, game_type;
				where ${nameFilter} & cover != null;
			sort total_rating_count desc;
			limit 30;
		`)

		const input = q.toLowerCase().trim()

		const games = data.map(g => {
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
				...g,
				relevance,
				platformIcons: [...slugs].sort().map(slug => ({
					name: slug,
					icon: `/platforms/result/${slug}.png`
				})),
				cover: g.cover?.url
					? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
					: null
			}
		}).sort((a, b) => b.relevance - a.relevance)

		res.json(games)
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}

}