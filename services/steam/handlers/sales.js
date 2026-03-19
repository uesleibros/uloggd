import { getCache, setCache } from "#lib/cache.js"

const STEAM_STORE_API = "https://store.steampowered.com/api"
const STEAM_CDN = "https://cdn.akamai.steamstatic.com/steam/apps"

const CACHE_TTL = {
  FEATURED: 1800
}

function getSteamImage(game) {
  if (game.large_capsule_image) return game.large_capsule_image
  if (game.header_image) return game.header_image
  if (game.id) return `${STEAM_CDN}/${game.id}/header.jpg`
  return null
}

function formatGame(game) {
  const image = getSteamImage(game)
  if (!image) return null

  return {
    id: game.id,
    name: game.name,
    image,
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
  const image = item.header_image || (item.id ? `${STEAM_CDN}/${item.id}/header.jpg` : null)
  if (!image) return null

  return {
    name: item.name,
    image,
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
      spotlights.push(...cat.items.map(formatSpotlight).filter(Boolean))
    }
  }

  const dailyDeal = data["6"]?.items?.[0]
    ? formatGame(data["6"].items[0])
    : null

  const specials = (data.specials?.items || [])
    .slice(0, 20)
    .map(formatGame)
    .filter(Boolean)
    .slice(0, 15)

  const specialIds = new Set(specials.map(s => s.id))
  const topSellers = (data.top_sellers?.items || [])
    .filter(g => !specialIds.has(g.id))
    .slice(0, 20)
    .map(formatGame)
    .filter(Boolean)
    .slice(0, 15)

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
