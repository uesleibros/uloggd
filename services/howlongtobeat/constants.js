export const HLTB_BASE = "https://howlongtobeat.com"

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export const TOKEN_TTL = 1000 * 60 * 30

export const MIN_NAME_SCORE = 180

export const NOISE_WORDS = new Set([
  "online", "edition", "definitive", "complete", "ultimate", "deluxe",
  "remastered", "remaster", "remake", "goty", "game of the year",
  "enhanced", "special", "premium", "gold", "silver", "standard",
  "digital", "anniversary", "legendary", "royal", "directors cut",
  "final cut", "extended", "expanded", "bundle", "collection",
  "hd", "4k", "the", "a", "an", "of", "and", "for", "super deluxe",
])

export const FINDER_BODY_TEMPLATE = {
  searchType: "games",
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
}