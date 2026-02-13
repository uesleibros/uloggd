import { query } from "../../lib/igdb-wrapper.js"

const FEATURED_SLUGS = [
  "psychopomp",
  "mother-3",
  "the-legend-of-zelda-twilight-princess",
  "minecraft-java-edition",
  "terraria",
  "downhill-domination",
  "the-legend-of-zelda-ocarina-of-time",
  "persona-5-royal",
  "portal-2",
  "grand-theft-auto-san-andreas",
  "mortal-kombat-armageddon",
  "super-mario-galaxy",
  "deltarune",
  "persona-3-portable",
  "super-mario-bros-3",
  "danganronpa-2-goodbye-despair",
  "final-fantasy-vi--2",
]

export default async function handler(req, res) {
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