import { supabase } from "#lib/supabase-ssr.js"

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

export async function getCache(key) {
  try {
    const { data } = await supabase
      .from("api_cache")
      .select("data")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    return data?.data ?? null
  } catch {
    return null
  }
}

export async function setCache(key, data, ttl) {
  try {
    await supabase.from("api_cache").upsert({
      key,
      data,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + getTTL(key, ttl) * 1000).toISOString()
    })
    return true
  } catch {
    return false
  }
}

export async function clearCache(pattern) {
  try {
    await supabase
      .from("api_cache")
      .delete()
      .like("key", `${pattern}%`)
    return true
  } catch {
    return false
  }
}

export async function getOrSet(key, fetcher, ttl) {
  const cached = await getCache(key)
  if (cached) return { data: cached, cached: true }

  try {
    const fresh = await fetcher()
    await setCache(key, fresh, ttl)
    return { data: fresh, cached: false }
  } catch {
    return { data: null, cached: false }
  }
}
