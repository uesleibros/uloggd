import { query } from "../../lib/igdb-wrapper.js"
import { AGE_RATINGS_MAP } from "../../data/ageRatingsMapper.js"
import { WEBSITE_MAP } from "../../data/websitesMapper.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { slug } = req.body
  if (!slug?.trim()) return res.status(400).json({ error: "missing slug" })

  try {
    const data = await query("games", `
      fields name, slug, summary,
             first_release_date,
             cover.url, cover.image_id,
             screenshots.url, screenshots.image_id,
             artworks.url, artworks.image_id,
             videos.video_id, videos.name,
             platforms.name, platforms.id,
             genres.name,
             themes.name,
             involved_companies.company.name,
             involved_companies.developer, involved_companies.publisher,
             game_modes.name,
             total_rating, total_rating_count,
             aggregated_rating, rating,
             hypes,
             keywords.name, keywords.slug,
             similar_games.name, similar_games.slug, similar_games.cover.url, similar_games.cover.image_id,
             dlcs.name, dlcs.slug, dlcs.cover.url, dlcs.cover.image_id,
             expansions.name, expansions.slug, expansions.cover.url, expansions.cover.image_id,
             standalone_expansions.name, standalone_expansions.slug, standalone_expansions.cover.url, standalone_expansions.cover.image_id,
             remakes.name, remakes.slug, remakes.cover.url, remakes.cover.image_id,
             remasters.name, remasters.slug, remasters.cover.url, remasters.cover.image_id,
             parent_game.name, parent_game.slug, parent_game.cover, parent_game.cover.url,
             age_ratings.organization, age_ratings.rating_category,
             websites.url, websites.type;
      where slug = "${slug}";
      limit 1;
    `)

    if (!data.length) return res.status(404).json({ error: "not found" })

    const g = data[0]

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

    const developers = g.involved_companies
      ?.filter(c => c.developer)
      .map(c => c.company.name) || []

    const publishers = g.involved_companies
      ?.filter(c => c.publisher)
      .map(c => c.company.name) || []

    const mapCovers = (arr) => arr?.map(item => ({
      ...item,
      cover: item.cover?.url
        ? { ...item.cover, url: item.cover.url.replace("t_thumb", "t_cover_big") }
        : null
    })) || []

    if (g.parent_game?.cover?.url) {
      g.parent_game.cover.url = g.parent_game.cover.url.replace("t_thumb", "t_logo_med")
    }

    const game = {
      ...g,
      ageRatings,
      developers,
      publishers,
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
    }

    res.json(game)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}