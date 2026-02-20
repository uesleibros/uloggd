import { HLTB_BASE, USER_AGENT, TOKEN_TTL, FINDER_BODY_TEMPLATE } from "#services/howlongtobeat/constants.js"

let cachedToken = null
let cachedAt = 0

const HEADERS_BASE = {
  Authority: "howlongtobeat.com",
  "User-Agent": USER_AGENT,
  Referer: `${HLTB_BASE}/`,
  Origin: HLTB_BASE,
}

async function getToken() {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL) return cachedToken

  const res = await fetch(`${HLTB_BASE}/api/finder/init?t=${Date.now()}`, {
    headers: HEADERS_BASE,
  })

  if (!res.ok) throw new Error(`HLTB init ${res.status}`)

  const json = await res.json()
  if (!json.token) throw new Error("HLTB no token")

  cachedToken = json.token
  cachedAt = Date.now()
  return cachedToken
}

export function invalidateToken() {
  cachedToken = null
}

export async function fetchFinder(terms) {
  const token = await getToken()

  const res = await fetch(`${HLTB_BASE}/api/finder`, {
    method: "POST",
    headers: {
      ...HEADERS_BASE,
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify({
      ...FINDER_BODY_TEMPLATE,
      searchTerms: terms,
    }),
  })

  if (!res.ok) {
    invalidateToken()
    throw new Error(`HLTB finder ${res.status}`)
  }

  const json = await res.json()
  return json.data || []
}

export async function fetchFinderWithRetry(terms) {
  try {
    return await fetchFinder(terms)
  } catch {
    try {
      return await fetchFinder(terms)
    } catch {
      return []
    }
  }
}