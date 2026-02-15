const HLTB = "https://howlongtobeat.com"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

let cachedToken = null
let cachedAt = 0
const TOKEN_TTL = 1000 * 60 * 30

async function getToken() {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL) return cachedToken

  const res = await fetch(`${HLTB}/api/finder/init?t=${Date.now()}`, {
    headers: {
    	Authority: "howlongtobeat.com",
      "User-Agent": UA,
      Referer: `${HLTB}/`,
      Origin: HLTB,
    },
  })

  if (!res.ok) throw new Error(`HLTB init ${res.status}`)

  const json = await res.json()
  if (!json.token) throw new Error("HLTB no token")

  cachedToken = json.token
  cachedAt = Date.now()
  return cachedToken
}

async function search(name) {
  const token = await getToken()

  const res = await fetch(`${HLTB}/api/finder`, {
    method: "POST",
    headers: {
    	Authority: "howlongtobeat.com",
      "Content-Type": "application/json",
      "User-Agent": UA,
      "X-Auth-Token": token,
      Referer: `${HLTB}/`,
      Origin: HLTB,
    },
    body: JSON.stringify({
      searchType: "games",
      searchTerms: name.split(/\s+/),
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: null, max: null },
          gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          rangeYear: { min: "", max: "" },
          modifier: "",
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0,
      },
      useCache: true,
    }),
  })

  if (!res.ok) {
    cachedToken = null
    throw new Error(`HLTB finder ${res.status}`)
  }

  const json = await res.json()
  return json.data || []
}

async function searchWithRetry(name) {
  try {
    return await search(name)
  } catch {
    cachedToken = null
    return await search(name)
  }
}

const secToHours = (s) => (s > 0 ? +(s / 3600).toFixed(1) : null)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "missing name" })

  try {
    const results = await searchWithRetry(name.trim())

    if (!results.length) return res.status(404).json({ error: "not found" })

    const g = results[0]

    res.json({
      id: g.game_id,
      name: g.game_name,
      image: g.game_image ? `${HLTB}/games/${g.game_image}` : null,
      releaseYear: g.release_world,
      reviewScore: g.review_score,
      platforms: g.profile_platform,
      times: {
        main: secToHours(g.comp_main),
        mainExtra: secToHours(g.comp_plus),
        completionist: secToHours(g.comp_100),
        allStyles: secToHours(g.comp_all),
      },
    })
  } catch (e) {
    console.error("HLTB error:", e)
    res.status(500).json({ error: "fail" })
  }
}