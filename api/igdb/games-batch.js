import { query } from "../../lib/igdb-wrapper.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

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