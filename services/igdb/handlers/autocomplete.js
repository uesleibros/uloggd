import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"

export async function handleAutocomplete(req, res) {
  const { query: q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  const sanitized = q.trim().replace(/"/g, '\\"')

  try {
    let data = await query("games", `
      search "${sanitized}";
      fields name, slug, first_release_date,
        cover.url, cover.image_id,
        platforms.id,
        total_rating, total_rating_count;
      where cover != null;
      limit 50;
    `)

    if (data.length === 0) {
      data = await query("games", `
        fields name, slug, first_release_date,
          cover.url, cover.image_id,
          platforms.id,
          total_rating, total_rating_count;
        where cover != null
          & name ~ *"${sanitized}"*;
        sort total_rating_count desc;
        limit 50;
      `)
    }

    const games = data
      .sort((a, b) => (b.total_rating_count || 0) - (a.total_rating_count || 0))
      .slice(0, 20)
      .map(g => {
        const slugs = new Set()
        g.platforms?.forEach(p => {
          const slug = PLATFORMS_MAP[String(p.id)]
          if (slug) slugs.add(slug)
        })

        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          first_release_date: g.first_release_date,
          total_rating: g.total_rating,
          total_rating_count: g.total_rating_count,
          platformIcons: [...slugs].sort().map(slug => ({
            name: slug,
            icon: `/platforms/result/${slug}.png`
          })),
          cover: g.cover?.url
            ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
            : null
        }
      })

    res.json(games)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
