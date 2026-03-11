import { query } from "#lib/igdbWrapper.js"
import { PLATFORMS_MAP } from "#data/platformsMapper.js"

export async function handleAutocomplete(req, res) {
  const { query: q } = req.query
  if (!q?.trim()) return res.status(400).json({ error: "missing query" })

  const sanitized = q.trim().replace(/"/g, '\\"')

  try {
    const [popular, all] = await Promise.all([
      query("games", `
        search "${sanitized}";
        fields name, slug, first_release_date,
          cover.url, cover.image_id,
          platforms.id,
          total_rating, total_rating_count;
        where cover != null
          & total_rating_count > 5;
        limit 15;
      `),
      query("games", `
        search "${sanitized}";
        fields name, slug, first_release_date,
          cover.url, cover.image_id,
          platforms.id,
          total_rating, total_rating_count;
        where cover != null;
        limit 20;
      `)
    ])

    const seen = new Set()
    const results = []

    ;[...popular, ...all].forEach(g => {
      if (seen.has(g.id)) return
      seen.add(g.id)

      const slugs = new Set()
      g.platforms?.forEach(p => {
        const slug = PLATFORMS_MAP[String(p.id)]
        if (slug) slugs.add(slug)
      })

      results.push({
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
      })
    })

    res.json(results.slice(0, 20))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
