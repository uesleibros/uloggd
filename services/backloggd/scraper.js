import * as cheerio from "cheerio"
import { gotScraping } from "got-scraping"
import { CookieJar, Cookie } from "tough-cookie"

const BASE = "https://www.backloggd.com"

const COOKIES = {
  "has_js": "true",
  "_pubcid": "8789042e-1da4-4147-a2fe-75568ddb6fa3",
  "_pubcid_cst": "znv0HA%3D%3D",
  "_lr_retry_request": "true",
  "_lr_env_src_ats": "false",
  "nitro-uid": "%7B%22TDID%22%3A%2273aade6f-c57b-4a2b-ad1f-dc5b0cbf9c5a%22%2C%22TDID_LOOKUP%22%3A%22TRUE%22%2C%22TDID_CREATED_AT%22%3A%222026-01-18T04%3A05%3A57%22%7D",
  "_lr_geo_location_state": "BA",
  "_lr_geo_location": "BR",
  "_nitroID": "1ed22c7b4e6fe9b9cc4de83155a0ac60",
  "ncmp.domain": "backloggd.com",
  "ncmp-ga": "1",
  "_lr_sampling_rate": "100",
  "nitro-uid_cst": "V0fMHQ%3D%3D",
  "_scor_uid": "d7e21a849845469b9cc8a2e43b815b7c",
  "ne_cookies_consent": "true",
  "_ga": "GA1.1.1222476375.1771387595",
  "FCNEC": "%5B%5B%22AKsRol_MutqNJON3NX5kmRmVo9xIbCjobpJb5cv1g6WPK1mNWLEtL_akCs-W-nAn5acrFUFY8WfH5bQPZMB7isA86836vqkMoMYhW2dPYpRtitWnI5bztyPiW1Btx09YF2uL8z5aTQHHfKfsztfLvQqJpn_eycGppw%3D%3D%22%5D%5D",
  "_ga_W5VPEML01P": "GS2.1.s1771387594$o1$g1$t1771391042$j60$l0$h0",
  "cto_bundle": "QY8gbF9NSjFBaE5ZUG1COG1QTm5BcnFqbkFtUVNoSDk0ajc2a0g1cm4wM2wzVjRLTVFRd0pEJTJCRiUyRlkxQlpHbzdoTnlUMWVhRFN3bTJZemZGRmh6VEx3dGElMkZuWTNRa3EwJTJCb0RHeWFuOWR1d3hia1hQckMlMkJVS2FMU0FQOUduMVZZVTd5biUyQlV3U0NVQyUyRmg4azBwcHhtbmpUekJlQSUzRCUzRA",
  "cto_bidid": "dg1tQF9JTzJnM0J4cElwY0tuOFA3QyUyQkhobDdZdUtuaktVYmNVdVBMeFd5V2hlb2pVRm82NDhUTkp6NHdta0RvS0liRVJwVlJQd2Njd0RaNnhkT2cxVUdOcFdvdTdGJTJGekEwYXNxS3ZMV2hycEtHTzQlM0Q",
  "FCCDCF": "%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%228b9c4541-2ef3-4768-88da-6fb9dd570d86%5C%22%2C%5B1771387559%2C795000000%5D%5D%22%5D%5D%5D",
  "__gads": "ID",
  "__gpi": "UID",
  "__eoi": "ID"
}

const HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": BASE
}

async function buildCookieJar() {
  const jar = new CookieJar()

  for (const [name, value] of Object.entries(COOKIES)) {
    const cookie = new Cookie({
      key: name,
      value: value,
      domain: "backloggd.com",
      path: "/"
    })
    await jar.setCookie(cookie, BASE)
  }

  return jar
}

let cookieJar = null

async function getCookieJar() {
  if (!cookieJar) {
    cookieJar = await buildCookieJar()
  }
  return cookieJar
}

async function fetchPage(url) {
  const jar = await getCookieJar()

  const { body, statusCode } = await gotScraping({
    url,
    cookieJar: jar,
    headers: HEADERS,
    headerGeneratorOptions: {
      browsers: ["chrome"],
      operatingSystems: ["windows"]
    }
  })

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}`)
  }

  return body
}

function getTotalPages(html) {
  const $ = cheerio.load(html)
  const pages = []

  $(".page").each((_, el) => {
    const n = parseInt($(el).text().trim(), 10)
    if (!isNaN(n)) pages.push(n)
  })

  return pages.length > 0 ? Math.max(...pages) : 1
}

function parseGames(html) {
  const $ = cheerio.load(html)
  const games = []

  $(".game-cover").each((_, el) => {
    const $el = $(el)
    const gameId = $el.attr("game_id")
    if (!gameId) return

    const link = $el.find("a.cover-link")
    const img = $el.find("img.card-img")
    if (!link.length) return

    const href = link.attr("href") || ""
    const slug = href.split("/games/").pop().replace(/\/$/, "")
    const title = img.length ? (img.attr("alt") || "").trim() : ""
    const cover = img.length ? (img.attr("src") || img.attr("data-src") || "") : ""
    const ratingRaw = $el.attr("data-rating")

    games.push({
      game_id: parseInt(gameId, 10),
      slug,
      title,
      cover,
      rating: ratingRaw ? parseInt(ratingRaw, 10) * 10 : null
    })
  })

  return games
}

async function scrapeSection(username, section) {
  const baseUrl = `${BASE}/u/${username}/games/added/type:${section}/`

  const html = await fetchPage(baseUrl)
  const totalPages = getTotalPages(html)
  const allGames = parseGames(html)

  for (let page = 2; page <= totalPages; page++) {
    const pageHtml = await fetchPage(`${baseUrl}?page=${page}`)
    allGames.push(...parseGames(pageHtml))
    await new Promise((r) => setTimeout(r, 800))
  }

  return allGames
}

export async function scrapeUser(username) {
  const sections = ["played", "playing", "backlog", "wishlist"]
  const gamesMap = {}

  for (const section of sections) {
    const data = await scrapeSection(username, section)

    for (const g of data) {
      if (!gamesMap[g.game_id]) {
        gamesMap[g.game_id] = {
          ...g,
          played: false,
          playing: false,
          backlog: false,
          wishlist: false
        }
      }
      gamesMap[g.game_id][section] = true
    }
  }

  return Object.values(gamesMap)
}

export async function verifyUser(username) {
  try {
    const html = await fetchPage(`${BASE}/u/${username}/`)
    return html.includes('id="profile-header"')
  } catch {
    return false
  }
}