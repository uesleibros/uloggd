import { getCache, setCache } from "#lib/cache.js"

const EPIC_API = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"

const CACHE_TTL = {
  EPIC: 3600
}

function getEffectiveDate(game) {
  const offer = game.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0]
  return offer?.startDate ? new Date(offer.startDate) : null
}

function getEndDate(game) {
  const offer = game.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0]
  return offer?.endDate ? new Date(offer.endDate) : null
}

function isCurrentlyFree(game) {
  if (!game.promotions?.promotionalOffers?.length) return false
  
  const offer = game.promotions.promotionalOffers[0]?.promotionalOffers?.[0]
  if (!offer) return false
  
  const now = new Date()
  const start = new Date(offer.startDate)
  const end = new Date(offer.endDate)
  
  return now >= start && now <= end && offer.discountSetting?.discountPercentage === 0
}

function isUpcoming(game) {
  if (!game.promotions?.upcomingPromotionalOffers?.length) return false
  
  const offer = game.promotions.upcomingPromotionalOffers[0]?.promotionalOffers?.[0]
  if (!offer) return false
  
  return offer.discountSetting?.discountPercentage === 0
}

function getUpcomingDate(game) {
  const offer = game.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0]
  return offer?.startDate ? new Date(offer.startDate) : null
}

function getUpcomingEndDate(game) {
  const offer = game.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0]
  return offer?.endDate ? new Date(offer.endDate) : null
}

function formatGame(game, type) {
  const images = game.keyImages || []
  const thumbnail = images.find(img => img.type === "Thumbnail")
    || images.find(img => img.type === "OfferImageWide")
    || images.find(img => img.type === "DieselStoreFrontWide")
    || images.find(img => img.type === "OfferImageTall")
    || images[0]

  const slug = game.catalogNs?.mappings?.[0]?.pageSlug 
    || game.productSlug 
    || game.urlSlug

  const originalPrice = game.price?.totalPrice?.originalPrice || 0
  const currencyCode = game.price?.totalPrice?.currencyCode || "USD"

  return {
    id: game.id,
    title: game.title,
    description: game.description,
    image: thumbnail?.url || null,
    url: slug ? `https://store.epicgames.com/p/${slug}` : "https://store.epicgames.com/free-games",
    originalPrice,
    currencyCode,
    type,
    startDate: type === "current" ? getEffectiveDate(game)?.toISOString() : getUpcomingDate(game)?.toISOString(),
    endDate: type === "current" ? getEndDate(game)?.toISOString() : getUpcomingEndDate(game)?.toISOString()
  }
}

async function getEpicFreeGames(locale, country) {
  const cacheKey = `epic_free_${locale}_${country}`
  const cached = await getCache(cacheKey)
  if (cached) return cached

  const res = await fetch(
    `${EPIC_API}?locale=${locale}&country=${country}&allowCountries=${country}`
  )

  if (!res.ok) return null

  const data = await res.json()
  const games = data.data?.Catalog?.searchStore?.elements || []

  const currentFree = games
    .filter(isCurrentlyFree)
    .map(g => formatGame(g, "current"))

  const upcoming = games
    .filter(isUpcoming)
    .map(g => formatGame(g, "upcoming"))

  const result = {
    current: currentFree,
    upcoming
  }

  await setCache(cacheKey, result, CACHE_TTL.EPIC)
  return result
}

export async function handleFreeGames(req, res) {
  const { locale = "pt-BR", country = "BR" } = req.query

  try {
    const data = await getEpicFreeGames(locale, country)

    if (!data) {
      return res.json({ current: [], upcoming: [] })
    }

    return res.json(data)
  } catch (e) {
    console.error("[Epic API] Failed to fetch free games:", e.message)
    return res.status(500).json({ error: "Failed to fetch free games" })
  }
}