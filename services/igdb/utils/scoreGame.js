import { PLATFORMS_MAP } from "#data/platformsMapper.js"

function scoreText(text, input) {
	const t = text.toLowerCase().trim()
	if (t === input) return 100
	if (t.startsWith(input)) return 85
	if (t.includes(input)) return 65
	const words = input.split(/\s+/)
	const matched = words.filter(w => t.includes(w)).length
	return (matched / words.length) * 40
}

export function scoreGame(g, q) {
	const input = q.toLowerCase().trim()
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

	const { alternative_names, ...rest } = g

	return {
		...rest,
		relevance,
		platformIcons: [...slugs].sort().map(slug => ({
			name: slug,
			icon: `/platforms/result/${slug}.png`
		})),
		cover: g.cover?.url
			? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
			: null
	}
}