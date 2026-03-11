import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"

export async function handleAutocomplete(req, res) {
  const { query: q } = req.query
  
  if (!q?.trim()) {
    return res.status(400).json({ error: "missing query" })
  }

  // Sanitização mais robusta
  const sanitized = q.trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')

  try {
    const data = await query("games", `
      fields name, slug, first_release_date,
        cover.url, cover.image_id,
        platforms.id,
        total_rating, total_rating_count;
      where cover != null & name ~ *"${sanitized}"*;
      sort total_rating_count desc, total_rating desc;
      limit 20;
    `)

    const games = data.map(g => {
      // Extrai e filtra plataformas válidas
      const platformSlugs = g.platforms
        ?.map(p => PLATFORMS_MAP[String(p.id)])
        .filter(Boolean) ?? []

      return {
        id: g.id,
        name: g.name,
        slug: g.slug,
        first_release_date: g.first_release_date,
        total_rating: g.total_rating,
        total_rating_count: g.total_rating_count,
        platformIcons: [...new Set(platformSlugs)]
          .sort()
          .map(slug => ({
            name: slug,
            icon: `/platforms/result/${slug}.png`
          })),
        cover: g.cover?.url
          ? { 
              ...g.cover, 
              url: g.cover.url.replace("t_thumb", "t_cover_big") 
            }
          : null
      }
    })

    res.json(games)
  } catch (e) {
    console.error("Autocomplete error:", e)
    res.status(500).json({ error: "fail" })
  }
}
