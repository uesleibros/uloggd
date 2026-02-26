import { getCache, setCache } from "#lib/cache.js"

const ITAD_API = "https://api.isthereanydeal.com"

async function searchITADGame(gameName, apiKey) {
  const url = `${ITAD_API}/games/search/v1?key=${apiKey}&title=${encodeURIComponent(gameName)}&limit=1`
  console.log("[ITAD Search] Fetching:", url.replace(apiKey, "HIDDEN_KEY"))
  
  const res = await fetch(url)
  if (!res.ok) {
    console.error("[ITAD Search] Falhou:", res.status, await res.text())
    return null
  }
  
  const data = await res.json()
  console.log("[ITAD Search] Resultado:", data)
  return data[0]?.id || null
}

async function getPriceHistory(gameId, apiKey, months = 12) {
  const since = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60)
  const url = `${ITAD_API}/games/history/v2?key=${apiKey}&id=${gameId}&country=BR&since=${since}`
  
  const res = await fetch(url)
  if (!res.ok) {
    console.error("[ITAD History] Falhou:", res.status, await res.text())
    return []
  }
  
  const data = await res.json()
  return (data.history || []).map(item => ({
    date: new Date(item.timestamp * 1000).toISOString().split('T')[0],
    price: item.deal.price.amount,
    store: item.deal.shop.name,
    regular: item.deal.regular.amount,
    discount: item.deal.cut
  }))
}

async function getCurrentPrices(gameId, apiKey) {
  const url = `${ITAD_API}/games/prices/v2?key=${apiKey}&id=${gameId}&country=BR&shops=steam,nuuvem,greenmangaming,epicgames`
  
  const res = await fetch(url)
  if (!res.ok) {
    console.error("[ITAD Prices] Falhou:", res.status, await res.text())
    return []
  }
  
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

export async function handleHistory(req, res) {
  const { gameName, fresh } = req.query

  if (!gameName) {
    return res.status(400).json({ error: "Missing gameName" })
  }

  const apiKey = process.env.ISTHEREANYDEAL_API_KEY
  if (!apiKey) {
    console.error("[ITAD] API KEY ESTÁ FALTANDO!")
    return res.status(500).json({ error: "API Key missing" })
  }

  const cacheKey = `price_history_${gameName.toLowerCase().replace(/\s+/g, '_')}`
  
  // Se passar &fresh=1 na URL, ele ignora o cache antigo
  if (fresh !== "1") {
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log("[ITAD] Retornando do cache para:", gameName)
      return res.json(cached)
    }
  }

  try {
    const itadId = await searchITADGame(gameName, apiKey)

    if (!itadId) {
      const empty = { history: [], deals: [], notFound: true }
      await setCache(cacheKey, empty, 86400)
      return res.json(empty)
    }

    const [history, deals] = await Promise.all([
      getPriceHistory(itadId, apiKey, 12),
      getCurrentPrices(itadId, apiKey)
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
