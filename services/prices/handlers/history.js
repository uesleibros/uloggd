import { getCache, setCache } from "#lib/cache.js"

const ITAD_API = "https://api.isthereanydeal.com"

const SUPPORTED_COUNTRIES = {
  BR: { currency: "BRL", symbol: "R$" },
  US: { currency: "USD", symbol: "$" },
  EU: { currency: "EUR", symbol: "€" },
  GB: { currency: "GBP", symbol: "£" },
  CA: { currency: "CAD", symbol: "CA$" },
  AU: { currency: "AUD", symbol: "A$" },
  JP: { currency: "JPY", symbol: "¥" },
  MX: { currency: "MXN", symbol: "MX$" },
  AR: { currency: "ARS", symbol: "ARS$" },
  CL: { currency: "CLP", symbol: "CLP$" },
  CO: { currency: "COP", symbol: "COP$" },
  RU: { currency: "RUB", symbol: "₽" },
  UA: { currency: "UAH", symbol: "₴" },
  PL: { currency: "PLN", symbol: "zł" },
  TR: { currency: "TRY", symbol: "₺" },
  IN: { currency: "INR", symbol: "₹" },
  CN: { currency: "CNY", symbol: "¥" },
  KR: { currency: "KRW", symbol: "₩" },
}

const DEFAULT_COUNTRY = "US"

function getCountryConfig(country) {
  const upper = (country || DEFAULT_COUNTRY).toUpperCase()
  return SUPPORTED_COUNTRIES[upper] || SUPPORTED_COUNTRIES[DEFAULT_COUNTRY]
}

async function searchBySteamAppId(steamId, apiKey) {
  const res = await fetch(
    `${ITAD_API}/games/lookup/v1?key=${apiKey}&appid=${steamId}`
  )

  if (!res.ok) return null

  const data = await res.json()
  return data?.game?.id || null
}

async function searchByName(gameName, apiKey) {
  const normalized = gameName
    .toLowerCase()
    .replace(/[™®©:]/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const res = await fetch(
    `${ITAD_API}/games/search/v1?key=${apiKey}&title=${encodeURIComponent(normalized)}&limit=1`
  )

  if (!res.ok) return null

  const data = await res.json()
  return data[0]?.id || null
}

async function getStoreLows(gameUuid, apiKey, country, months = 12) {
  const since = Math.floor(Date.now() / 1000) - months * 30 * 24 * 60 * 60

  const res = await fetch(
    `${ITAD_API}/games/storelow/v2?key=${apiKey}&country=${country}&since=${since}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([gameUuid]),
    }
  )

  if (!res.ok) return []

  const data = await res.json()
  const lows = data[0]?.lows || []

  return lows.map(item => ({
    date: item.timestamp.split("T")[0],
    price: item.price.amount,
    currency: item.price.currency,
    store: item.shop.name,
    storeId: item.shop.id,
    regular: item.regular.amount,
    discount: item.cut,
  }))
}

async function getCurrentPrices(gameUuid, apiKey, country) {
  const res = await fetch(
    `${ITAD_API}/games/prices/v3?key=${apiKey}&country=${country}&shops=steam,nuuvem,greenmangaming,epicgames,gog,humble`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([gameUuid]),
    }
  )

  if (!res.ok) return { deals: [], historyLow: null }

  const data = await res.json()
  const gameData = data[0] || {}

  const deals = (gameData.deals || []).map(deal => ({
    store: deal.shop.name,
    storeId: deal.shop.id,
    price: deal.price.amount,
    currency: deal.price.currency,
    oldPrice: deal.regular.amount,
    discount: deal.cut,
    url: deal.url,
    storeLow: deal.storeLow?.amount || null,
  }))

  return {
    deals,
    historyLow: gameData.historyLow || null,
  }
}

export async function handleHistory(req, res) {
  const { gameName, steamId, country = DEFAULT_COUNTRY, fresh } = req.query

  if (!gameName && !steamId) {
    return res.status(400).json({ error: "Missing gameName or steamId" })
  }

  const apiKey = process.env.ISTHEREANYDEAL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "API Key missing" })
  }

  const countryUpper = country.toUpperCase()
  const countryConfig = getCountryConfig(countryUpper)

  const cacheKey = steamId
    ? `price_history_steam_${steamId}_${countryUpper}`
    : `price_history_${gameName.toLowerCase().replace(/\s+/g, "_")}_${countryUpper}`

  if (fresh !== "1") {
    const cached = await getCache(cacheKey)
    if (cached) return res.json(cached)
  }

  try {
    let gameUuid = null

    if (steamId) {
      gameUuid = await searchBySteamAppId(steamId, apiKey)
    }

    if (!gameUuid && gameName) {
      gameUuid = await searchByName(gameName, apiKey)
    }

    if (!gameUuid) {
      const empty = {
        storeLows: [],
        deals: [],
        historyLow: null,
        notFound: true,
        country: countryUpper,
        currency: countryConfig.currency,
      }
      await setCache(cacheKey, empty, 86400)
      return res.json(empty)
    }

    const [storeLows, priceData] = await Promise.all([
      getStoreLows(gameUuid, apiKey, countryUpper, 12),
      getCurrentPrices(gameUuid, apiKey, countryUpper),
    ])

    const { deals, historyLow } = priceData

    if (!storeLows.length && !deals.length) {
      const empty = {
        storeLows: [],
        deals: [],
        historyLow: null,
        notFound: true,
        country: countryUpper,
        currency: countryConfig.currency,
      }
      await setCache(cacheKey, empty, 86400)
      return res.json(empty)
    }

    const currentPrice = deals[0]?.price || null
    const lowestEver = historyLow?.all?.amount || null
    const lowestYear = historyLow?.y1?.amount || null

    const result = {
      itadId: gameUuid,
      country: countryUpper,
      currency: countryConfig.currency,
      currencySymbol: countryConfig.symbol,
      current: deals[0] || null,
      storeLows,
      deals,
      stats: {
        currentPrice,
        lowestEver,
        lowestYear,
        lowestMonth: historyLow?.m3?.amount || null,
      },
    }

    await setCache(cacheKey, result, 43200)
    res.json(result)
  } catch (e) {
    console.error("[Price History] Error:", e.message)
    res.status(500).json({ error: "Failed to fetch price history" })
  }
}

export function getSupportedCountries() {
  return Object.entries(SUPPORTED_COUNTRIES).map(([code, config]) => ({
    code,
    ...config,
  }))
}
