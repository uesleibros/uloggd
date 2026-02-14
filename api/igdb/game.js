import { query } from "../../lib/igdb-wrapper.js"
import { PLATFORM_PRIORITY, PLATFORMS_MAP } from "../../data/platformsMapper.js"
import { AGE_RATINGS_MAP } from "../../data/ageRatingsMapper.js"
import { WEBSITE_MAP } from "../../data/websitesMapper.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { slug } = req.body
  if (!slug?.trim()) return res.status(400).json({ error: "missing slug" })

  try {
    const data = await query("games", `
      fields name, slug, summary, storyline,
             first_release_date,
             cover.url, cover.image_id,
             screenshots.url, screenshots.image_id,
             artworks.url, artworks.image_id,
             videos.video_id, videos.name,
             platforms.name, platforms.abbreviation,
             genres.name,
             themes.name,
             involved_companies.company.name, involved_companies.company.logo.url,
             involved_companies.developer, involved_companies.publisher, involved_companies.porting, involved_companies.supporting,
             game_modes.name,
             player_perspectives.name,
             game_engines.name,
             total_rating, total_rating_count,
             aggregated_rating, aggregated_rating_count,
             rating, rating_count,
             follows, hypes,
             keywords, keywords.name, keywords.slug,
             similar_games.name, similar_games.slug, similar_games.cover.url, similar_games.cover.image_id,
             dlcs.name, dlcs.slug, dlcs.cover.url, dlcs.cover.image_id,
             expansions.name, expansions.slug, expansions.cover.url, expansions.cover.image_id,
             standalone_expansions.name, standalone_expansions.slug, standalone_expansions.cover.url, standalone_expansions.cover.image_id,
             remakes.name, remakes.slug, remakes.cover.url, remakes.cover.image_id,
             remasters.name, remasters.slug, remasters.cover.url, remasters.cover.image_id,
             parent_game.name, parent_game.slug, parent_game.cover, parent_game.cover.url,
             franchises.name,
             collection.name, collection.games.name, collection.games.slug, collection.games.cover.url, collection.games.cover.image_id,
             age_ratings, age_ratings.organization, age_ratings.rating_category,
             language_supports.language.name, language_supports.language_support_type.name,
             game_type,
             websites.url, websites.type;
      where slug = "${slug}";
      limit 1;
    `)

    if (!data.length) return res.status(404).json({ error: "not found" })

    const g = data[0]

    const slugs = new Set()
    g.platforms?.forEach(p => {
      const s = PLATFORMS_MAP[String(p.id)]
      if (s) slugs.add(s)
    })

    const ageRatings = g.age_ratings?.map(ar => {
      const orgData = AGE_RATINGS_MAP[ar.organization]
      if (!orgData) return null
      
      const ratingLabel = orgData.ratings[ar.rating_category]
      if (!ratingLabel) return null
      
      return {
        category: orgData.org,
        rating: ratingLabel,
        region: orgData.region
      }
    }).filter(Boolean) || []

    const websites = g.websites?.map(site => ({
      url: site.url,
      ...WEBSITE_MAP[site.type]
    })).filter(site => site.type) || []

    const platformIcons = [...slugs]
      .sort((a, b) => (PLATFORM_PRIORITY[a] ?? 99) - (PLATFORM_PRIORITY[b] ?? 99))
      .map(s => ({ name: s, icon: `/platforms/${s}.png` }))

    const developers = g.involved_companies
      ?.filter(c => c.developer)
      .map(c => c.company.name) || []

    const publishers = g.involved_companies
      ?.filter(c => c.publisher)
      .map(c => c.company.name) || []

    const porters = g.involved_companies
      ?.filter(c => c.porting)
      .map(c => c.company.name) || []

    const supporters = g.involved_companies
      ?.filter(c => c.supporting)
      .map(c => c.company.name) || []

    const mapCovers = (arr) => arr?.map(item => ({
      ...item,
      cover: item.cover?.url
        ? { ...item.cover, url: item.cover.url.replace("t_thumb", "t_cover_big") }
        : null
    })) || []

    if (g.parent_game) g.parent_game.cover.url = g.parent_game.cover.url.replace("t_thumb", "t_logo_med")

    const game = {
      ...g,
      ageRatings,
      platformIcons,
      developers,
      publishers,
      porters,
      supporters,
      websites,
      cover: g.cover?.url
        ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_1080p") }
        : null,
      screenshots: g.screenshots?.map(s => ({
        ...s,
        url: s.url.replace("t_thumb", "t_1080p")
      })) || [],
      artworks: g.artworks?.map(a => ({
        ...a,
        url: a.url.replace("t_thumb", "t_1080p")
      })) || [],
      similar_games: mapCovers(g.similar_games),
      dlcs: mapCovers(g.dlcs),
      expansions: mapCovers(g.expansions),
      standalone_expansions: mapCovers(g.standalone_expansions),
      remakes: mapCovers(g.remakes),
      remasters: mapCovers(g.remasters),
      collection: g.collection ? {
        ...g.collection,
        games: mapCovers(g.collection.games)
      } : null
    }

    res.json(game)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }

}





