import { getCache, setCache } from "#lib/cache.js"

const STEAM_STORE_API = "https://store.steampowered.com/api"

const CACHE_TTL = {
  FEATURED: 1800
}

function formatGame(game) {
  return {
    id: game.id,
    name: game.name,
    image: game.large_capsule_image || game.header_image,
    originalPrice: game.original_price,
    finalPrice: game.final_price,
    discountPercent: game.discount_percent,
    discounted: game.discounted || false,
    steamUrl: `https://store.steampowered.com/app/${game.id}`,
    currency: game.currency || "BRL",
    discountExpiration: game.discount_expiration || null
  }
}

function formatSpotlight(item) {
  return {
    name: item.name,
    image: item.header_image,
    body: item.body,
    url: item.url
  }
}

async function getFeaturedData(countryCode, language) {
  const cacheKey = `steam_featured_${countryCode}_${language}`
  const cached = await getCache(cacheKey)
  if (cached) return cached

  const res = await fetch(
    `${STEAM_STORE_API}/featuredcategories/?cc=${countryCode}&l=${language}`
  )

  if (!res.ok) return null

  const data = await res.json()

  const spotlights = []
  for (let i = 0; i <= 5; i++) {
    const cat = data[String(i)]
    if (cat?.id === "cat_spotlight" && cat.items?.length) {
      spotlights.push(...cat.items.map(formatSpotlight))
    }
  }

  const dailyDeal = data["6"]?.items?.[0]
    ? formatGame(data["6"].items[0])
    : null

  const specials = (data.specials?.items || [])
    .slice(0, 15)
    .map(formatGame)

  const specialIds = new Set(specials.map(s => s.id))
  const topSellers = (data.top_sellers?.items || [])
    .filter(g => !specialIds.has(g.id))
    .slice(0, 15)
    .map(formatGame)

  const result = {
    spotlights,
    dailyDeal,
    specials,
    topSellers
  }

  await setCache(cacheKey, result, CACHE_TTL.FEATURED)
  return result
}

export async function handleSales(req, res) {
  const { cc = "br", lang = "portuguese" } = req.query

  try {
    const data = await getFeaturedData(cc, lang)

    if (!data) {
      return res.json({ spotlights: [], dailyDeal: null, specials: [], topSellers: [] })
    }

    return res.json(data)
  } catch (e) {
    console.error("[Steam API] Failed to fetch featured:", e.message)
    return res.status(500).json({ error: "Failed to fetch featured data" })
  }
}