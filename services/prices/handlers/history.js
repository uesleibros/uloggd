import { getCache, setCache } from "#lib/cache.js"

const ITAD_API = "https://api.isthereanydeal.com"
const API_KEY = process.env.ISTHEREANYDEAL_API_KEY

async function searchITADGame(gameName) {
  const res = await fetch(
    `${ITAD_API}/games/search/v1?key=${API_KEY}&title=${encodeURIComponent(gameName)}&limit=1`
  )
  
  if (!res.ok) return null
  
  const data = await res.json()
  return data[0]?.id || null
}

async function getPriceHistory(gameId, months = 12) {
  const since = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60)
  
  const res = await fetch(
    `${ITAD_API}/games/history/v2?key=${API_KEY}&id=${gameId}&country=BR&since=${since}`
  )
  
  if (!res.ok) return []
  
  const data = await res.json()
  
  return (data.history || []).map(item => ({
    date: new Date(item.timestamp * 1000).toISOString().split('T')[0],
    price: item.deal.price.amount,
    store: item.deal.shop.name,
    regular: item.deal.regular.amount,
    discount: item.deal.cut
  }))
}

async function getCurrentPrices(gameId) {
  const res = await fetch(
    `${ITAD_API}/games/prices/v2?key=${API_KEY}&id=${gameId}&country=BR&shops=steam,nuuvem,greenmangaming,epicgames`
  )
  
  if (!res.ok) return []
  
  const data = await res.json()
  
  return (data.deals || []).map(deal => ({
    store: deal.shop.name,
    storeId: deal.shop.id,
    price: deal.price.amount,
    oldPrice: deal.regular.amount,
    discount: deal.cut,
    url: deal.url
  }))
}

export async function handlePriceHistory(req, res) {
  const { gameName } = req.query

  if (!gameName) {
    return res.status(400).json({ error: "Missing gameName" })
  }

  const cacheKey = `price_history_${gameName.toLowerCase().replace(/\s+/g, '_')}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const itadId = await searchITADGame(gameName)

    if (!itadId) {
      const empty = { history: [], deals: [], notFound: true }
      await setCache(cacheKey, empty, 86400)
      return res.json(empty)
    }

    const [history, deals] = await Promise.all([
      getPriceHistory(itadId, 12),
      getCurrentPrices(itadId)
    ])

    if (!history.length && !deals.length) {
      const empty = { history: [], deals: [], notFound: true }
      await setCache(cacheKey, empty, 86400)
      return res.json(empty)
    }

    const prices = history.map(h => h.price).filter(p => p > 0)

    const result = {
      itadId,
      current: deals[0] || (history.length ? { price: history[history.length - 1].price } : null),
      history,
      deals,
      stats: prices.length ? {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
        average: prices.reduce((a, b) => a + b, 0) / prices.length
      } : null
    }

    await setCache(cacheKey, result, 43200)
    res.json(result)

  } catch (e) {
    console.error("[Price History] Error:", e.message)
    res.status(500).json({ error: "Failed to fetch price history" })
  }
}
