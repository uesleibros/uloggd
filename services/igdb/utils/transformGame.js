import { PLATFORMS_MAP } from "#data/platformsMapper.js"
import { getGameType } from "#data/gameTypes.js"

export function transformGameResult(game, options = {}) {
  const {
    coverSize = "t_cover_small",
    includeRelevance = false,
    searchInput = null,
  } = options

  const slugs = new Set()
  game.platforms?.forEach(p => {
    const slug = PLATFORMS_MAP[String(p.id)]
    if (slug) slugs.add(slug)
  })

  const result = {
    id: game.id,
    name: game.name,
    slug: game.slug,
    first_release_date: game.first_release_date,
    gameType: getGameType(game.game_type),
    versionTitle: game.version_title || null,
    parentGame: game.parent_game?.name || null,
    platformIcons: [...slugs].sort().map(slug => ({
      name: slug,
      icon: `/platforms/result/${slug}.png`,
    })),
    cover: game.cover?.url
      ? { url: game.cover.url.replace("t_thumb", coverSize) }
      : null,
  }

  if (game.total_rating !== undefined) {
    result.total_rating = game.total_rating
  }

  if (game.total_rating_count !== undefined) {
    result.total_rating_count = game.total_rating_count
  }

  if (game.summary !== undefined) {
    result.summary = game.summary
  }

  if (includeRelevance && searchInput) {
    result.relevance = calculateRelevance(game, searchInput)
  }

  return result
}

export function calculateRelevance(game, input) {
  const normalizedInput = input.toLowerCase()
  const inputWords = normalizedInput.split(/\s+/)

  const name = game.name.toLowerCase()
  const altNames = game.alternative_names?.map(a => a.name.toLowerCase()) || []
  const allNames = [name, ...altNames]

  let relevance = 0

  for (const n of allNames) {
    let score = 0

    if (n === normalizedInput) score = 100
    else if (n.startsWith(normalizedInput)) score = 80
    else if (n.includes(normalizedInput)) score = 60
    else {
      const matched = inputWords.filter(w => n.includes(w)).length
      score = (matched / inputWords.length) * 40
    }

    score -= n.length * 0.1

    if (score > relevance) relevance = score
  }

  relevance += Math.min((game.total_rating_count || 0) / 100, 20)

  return relevance
}

export function sortByRelevance(games) {
  return [...games].sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
}
