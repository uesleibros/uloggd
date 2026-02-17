export const config = {
  runtime: "nodejs"
}

import { query } from "../../lib/igdb-wrapper.js"
import { PLATFORMS_MAP } from "../../data/platformsMapper.js"
import { AGE_RATINGS_MAP } from "../../data/ageRatingsMapper.js"
import { WEBSITE_MAP } from "../../data/websitesMapper.js"

function escapeIGDB(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function generateVariations(q) {
  const variations = new Set()
  const lower = q.toLowerCase().trim()

  variations.add(lower)
  variations.add(lower.replace(/\s+/g, ""))
  variations.add(lower.replace(/([a-z])([A-Z])/g, "$1 $2"))

  if (!lower.includes(" ")) {
    const splits = []
    for (let i = 2; i <= lower.length - 2; i++) {
      splits.push(lower.slice(0, i) + " " + lower.slice(i))
    }
    splits.forEach(s => variations.add(s))
  }

  if (lower.includes(" ")) {
    variations.add(lower.replace(/\s+/g, "-"))
    variations.add(lower.replace(/\s+/g, ""))
  }
  if (lower.includes("-")) {
    variations.add(lower.replace(/-/g, " "))
    variations.add(lower.replace(/-/g, ""))
  }

  const numberMap = {
    "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v",
    "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
  }
  const romanMap = Object.fromEntries(Object.entries(numberMap).map(([k, v]) => [v, k]))

  variations.forEach(v => {
    const withRoman = v.replace(/\b(\d+)\b/g, (_, n) => numberMap[n] || n)
    if (withRoman !== v) variations.add(withRoman)
    const withArabic = v.replace(/\b(i{1,3}|iv|vi{0,3}|ix|x)\b/gi, (m) => romanMap[m.toLowerCase()] || m)
    if (withArabic !== v) variations.add(withArabic)
  })

  const prefixMap = {
    "re": ["re-", "re "],
    "pre": ["pre-", "pre "],
    "un": ["un-", "un "],
    "non": ["non-", "non "],
    "mega": ["mega "],
    "super": ["super "],
    "ultra": ["ultra "],
    "mini": ["mini "],
    "micro": ["micro "],
    "neo": ["neo "],
    "bio": ["bio "],
    "cyber": ["cyber "],
  }

  variations.forEach(v => {
    for (const [prefix, replacements] of Object.entries(prefixMap)) {
      if (v.startsWith(prefix) && v.length > prefix.length && v[prefix.length] !== " " && v[prefix.length] !== "-") {
        replacements.forEach(r => variations.add(r + v.slice(prefix.length)))
      }
      replacements.forEach(r => {
        if (v.startsWith(r)) {
          variations.add(prefix + v.slice(r.length))
        }
      })
    }
  })

  const suffixMap = {
    "man": [" man"],
    "boy": [" boy"],
    "craft": [" craft"],
    "vania": [" vania"],
    "world": [" world"],
    "land": [" land"],
    "star": [" star"],
    "fire": [" fire"],
    "ball": [" ball"],
    "blade": [" blade"],
    "soul": [" soul"],
    "born": [" born"],
    "bound": [" bound"],
  }

  variations.forEach(v => {
    for (const [suffix, replacements] of Object.entries(suffixMap)) {
      if (v.endsWith(suffix) && v.length > suffix.length) {
        const before = v.slice(0, -suffix.length)
        if (before[before.length - 1] !== " " && before[before.length - 1] !== "-") {
          replacements.forEach(r => variations.add(before + r))
        }
      }
      replacements.forEach(r => {
        if (v.endsWith(r)) {
          variations.add(v.slice(0, -r.length) + suffix)
        }
      })
    }
  })

  return [...variations].filter(v => v.length >= 2)
}

function buildNameFilter(raw) {
  const q = raw.trim()
  const words = q.split(/\s+/).filter(w => w.length >= 2)
  const variations = generateVariations(q)

  const parts = []

  if (words.length > 1) {
    parts.push(words.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & "))
  }

  variations.forEach(v => {
    const vWords = v.split(/\s+/).filter(w => w.length >= 2)
    if (vWords.length > 1) {
      parts.push(vWords.map(w => `name ~ *"${escapeIGDB(w)}"*`).join(" & "))
    } else {
      parts.push(`name ~ *"${escapeIGDB(v)}"*`)
    }
  })

  const unique = [...new Set(parts)]
  return unique.length > 1 ? `(${unique.join(" | ")})` : unique[0]
}

const FEATURED_SLUGS = [
  "psychopomp",
  "mother-3",
  "the-legend-of-zelda-twilight-princess",
  "minecraft-java-edition",
  "terraria",
  "downhill-domination",
  "shin-megami-tensei-v-vengeance",
  "persona-5-royal",
  "portal-2",
  "osu",
  "grand-theft-auto-san-andreas",
  "mortal-kombat-armageddon",
  "the-binding-of-isaac-rebirth",
  "super-mario-galaxy",
  "deltarune",
  "half-life-2",
  "celeste",
  "danganronpa-2-goodbye-despair",
  "final-fantasy-vi--2",
]

async function handleAutocomplete(req, res) {
  const { query: q } = req.body
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  try {
    const nameFilter = buildNameFilter(q)

    const data = await query("games", `
      fields name, slug, first_release_date,
             cover.url, cover.image_id,
             platforms.id, platforms.name, platforms.abbreviation,
             total_rating, total_rating_count,
             game_type;
      where ${nameFilter}
        & game_type = (0,2,4,8,9,10)
        & cover != null;
      sort total_rating_count desc;
      limit 30;
    `)

    const input = q.toLowerCase().trim()

    const games = data
      .map(g => {
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

        const platformIcons = [...slugs]
          .sort((a, b) => a.localeCompare(b))
          .map(slug => ({
            name: slug,
            icon: `/platforms/result/${slug}.png`
          }))

        return {
          ...g,
          relevance,
          platformIcons,
          cover: g.cover?.url
            ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_logo_med") }
            : null
        }
      })
      .sort((a, b) => b.relevance - a.relevance)

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

async function handleGame(req, res) {
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
        alternative_names.name,
        involved_companies.company.name,
        involved_companies.developer, involved_companies.publisher,
        game_modes.name,
        game_engines.name,
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

    const platforms = g.platforms
      ?.slice()
      .sort((a, b) => a.name.localeCompare(b.name)) || []

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
      platforms,
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

async function handleGamesBatch(req, res) {
  const { slugs } = req.body
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: "missing slugs array" })
  }

  const uniqueSlugs = [...new Set(slugs)].slice(0, 50)
  const slugCondition = uniqueSlugs.map(s => `"${s}"`).join(",")

  try {
    const data = await query("games", `
      fields name, slug, summary,
             first_release_date,
             cover.url, cover.image_id,
             artworks.url, artworks.image_id,
             platforms.name, platforms.id,
             genres.name,
             involved_companies.company.name,
             involved_companies.developer;
      where slug = (${slugCondition});
      limit ${uniqueSlugs.length};
    `)

    const games = {}
    for (const g of data) {
      const developers = g.involved_companies
        ?.filter(c => c.developer)
        .map(c => c.company.name) || []

      const platforms = g.platforms
        ?.slice()
        .sort((a, b) => a.name.localeCompare(b.name)) || []

      games[g.slug] = {
        ...g,
        developers,
        platforms,
        cover: g.cover?.url
          ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
          : null,
        artworks: g.artworks?.map(a => ({
          ...a,
          url: a.url.replace("t_thumb", "t_1080p")
        })) || [],
      }
    }

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

async function handleUsersChoice(req, res) {
  try {
    const slugList = FEATURED_SLUGS.map(s => `"${s}"`).join(",")

    const data = await query("games", `
      fields name, slug, cover.url, cover.image_id, total_rating;
      where slug = (${slugList});
      limit ${FEATURED_SLUGS.length};
    `)

    const games = data.map(g => ({
      ...g,
      cover: g.cover?.url
        ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
        : null
    }))

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

const ACTIONS = {
  autocomplete: handleAutocomplete,
  game: handleGame,
  "games-batch": handleGamesBatch,
  "users-choice": handleUsersChoice,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { action } = req.query
  const fn = ACTIONS[action]

  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}
