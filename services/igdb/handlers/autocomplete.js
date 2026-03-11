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

		const input = q.toLowerCase().trim()

		const games = data.map(g => {
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
				...g,
				alternative_names: undefined,
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