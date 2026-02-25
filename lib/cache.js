const MAX_CACHE_SIZE = 5000
const cache = new Map()

const TTL = {
  igdb: 86400,
  steam: 600,
  xbox: 600,
  twitch: 300,
  discord: 60
}

const DEFAULT_TTL = 600

function getTTL(key, customTTL) {
  if (customTTL) return customTTL
  const prefix = key.split("_")[0]
  return TTL[prefix] || DEFAULT_TTL
}

export function getCache(key) {
  const item = cache.get(key)
  if (!item) return null
  
  if (Date.now() > item.expires) {
    cache.delete(key)
    return null
  }

  cache.delete(key)
  cache.set(key, item)
  
  return item.data
}

export function setCache(key, data, ttl) {
  if (cache.has(key)) {
    cache.delete(key)
  }

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }

  cache.set(key, {
    data,
    expires: Date.now() + getTTL(key, ttl) * 1000
  })
}

export function clearCache(pattern) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key)
  }
}

export async function getOrSet(key, fetcher, ttl) {
  const cached = getCache(key)
  if (cached) return { data: cached, cached: true }

  try {
    const fresh = await fetcher()
    setCache(key, fresh, ttl)
    return { data: fresh, cached: false }
  } catch {
    return { data: null, cached: false }
  }
}