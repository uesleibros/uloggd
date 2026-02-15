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

async function fetchFinder(terms) {
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
      searchTerms: terms,
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

const NOISE = new Set([
  "online", "edition", "definitive", "complete", "ultimate", "deluxe",
  "remastered", "remaster", "remake", "goty", "game of the year",
  "enhanced", "special", "premium", "gold", "silver", "standard",
  "digital", "anniversary", "legendary", "royal", "directors cut",
  "final cut", "extended", "expanded", "bundle", "collection",
  "hd", "4k", "the", "a", "an", "of", "and", "for", "super deluxe",
])

const PLATFORM_FAMILIES = {
  pc: ["pc", "microsoft windows", "windows", "mac", "linux"],
  playstation: ["ps", "playstation", "ps1", "ps2", "ps3", "ps4", "ps5", "psx", "vita", "psp"],
  xbox: ["xbox", "xbox 360", "xbox one", "xbox series", "xsx"],
  nintendo: ["nintendo", "switch", "wii", "wii u", "gamecube", "n64", "nes", "snes", "3ds", "ds", "game boy", "gba", "gbc"],
  mobile: ["ios", "android", "mobile"],
}

function norm(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['':\-–—.!?]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function strip(str) {
  return norm(str).split(" ").filter(w => !NOISE.has(w)).join(" ")
}

function words(str) {
  return norm(str).split(" ").filter(w => w.length >= 2)
}

function buildQueries(name, altNames) {
  const seen = new Set()
  const queries = []

  const push = (terms) => {
    if (terms.length === 0) return
    const key = terms.join("|")
    if (seen.has(key)) return
    seen.add(key)
    queries.push(terms)
  }

  const allNames = [name, ...(altNames || [])]

  for (const n of allNames) {
    const full = words(n)
    const clean = strip(n).split(" ").filter(w => w.length >= 2)

    push(full)
    push(clean)

    if (full.length > 2) push(full.slice(0, -1))
    if (clean.length > 2) push(clean.slice(0, -1))
    if (full.length > 3) push(full.slice(0, Math.ceil(full.length * 0.6)))
  }

  return queries
}

function platformMatch(hltbPlatforms, igdbPlatforms) {
  if (!hltbPlatforms || !igdbPlatforms?.length) return 0

  const h = norm(hltbPlatforms)
  let hits = 0

  for (const p of igdbPlatforms) {
    const pn = norm(p)
    if (h.includes(pn)) { hits++; continue }

    for (const aliases of Object.values(PLATFORM_FAMILIES)) {
      if (aliases.some(a => pn.includes(a)) && aliases.some(a => h.includes(a))) {
        hits++
        break
      }
    }
  }

  return hits / igdbPlatforms.length
}

function similarity(a, b) {
  const an = norm(a)
  const bn = norm(b)
  const ac = strip(a)
  const bc = strip(b)

  if (an === bn) return 500
  if (ac === bc) return 450

  let s = 0

  if (an.startsWith(bn + " ") || bn.startsWith(an + " ")) s += 350
  else if (ac.startsWith(bc + " ") || bc.startsWith(ac + " ")) s += 320
  else if (an.startsWith(bn) || bn.startsWith(an)) s += 300
  else if (ac.startsWith(bc) || bc.startsWith(ac)) s += 280
  else if (an.includes(bn) || bn.includes(an)) s += 200
  else if (ac.includes(bc) || bc.includes(ac)) s += 180

  const aw = ac.split(" ").filter(w => w.length >= 2)
  const bw = bc.split(" ").filter(w => w.length >= 2)

  if (bw.length > 0) {
    const matched = bw.filter(w => aw.some(x => x === w || x.includes(w) || w.includes(x))).length
    s += (matched / bw.length) * 100
  }

  s -= Math.min(Math.abs(ac.length - bc.length) * 1.5, 50)

  return s
}

function bestNameScore(hltbGame, allNames) {
  let best = 0

  for (const n of allNames) {
    best = Math.max(best, similarity(hltbGame.game_name, n))
  }

  if (hltbGame.game_alias) {
    const aliases = hltbGame.game_alias.split(",").map(s => s.trim()).filter(Boolean)
    for (const ha of aliases) {
      for (const n of allNames) {
        best = Math.max(best, similarity(ha, n))
      }
    }
  }

  return best
}

function score(g, name, altNames, year, platforms) {
  const allNames = [name, ...(altNames || [])]

  let s = bestNameScore(g, allNames)

  if (year && g.release_world) {
    const diff = Math.abs(g.release_world - year)
    if (diff === 0) s += 100
    else if (diff === 1) s += 60
    else if (diff === 2) s += 20
    else s -= diff * 15
  }

  if (platforms?.length) {
    s += platformMatch(g.profile_platform, platforms) * 80
  }

  if (g.count_comp > 1000) s += 20
  else if (g.count_comp > 100) s += 10

  return s
}

async function findGame(name, altNames, year, platforms) {
  const queries = buildQueries(name, altNames)
  const seen = new Map()

  for (const terms of queries) {
    try {
      const results = await fetchFinder(terms)
      for (const g of results) {
        if (!seen.has(g.game_id)) seen.set(g.game_id, g)
      }
    } catch {
      cachedToken = null
      try {
        const results = await fetchFinder(terms)
        for (const g of results) {
          if (!seen.has(g.game_id)) seen.set(g.game_id, g)
        }
      } catch {
        continue
      }
    }
  }

  const all = [...seen.values()]
  if (!all.length) return null

  return all
    .map(g => ({ ...g, _score: score(g, name, altNames, year, platforms) }))
    .sort((a, b) => b._score - a._score)[0]
}

const secToHours = (s) => (s > 0 ? +(s / 3600).toFixed(1) : null)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { name, altNames, year, platforms } = req.body
  if (!name?.trim()) return res.status(400).json({ error: "missing name" })

  try {
    const g = await findGame(name.trim(), altNames || [], year || null, platforms || null)

    if (!g) return res.status(404).json({ error: "not found" })

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