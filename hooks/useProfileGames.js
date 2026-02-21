import { useState, useEffect, useCallback } from "react"

const TAB_FILTERS = {
  playing: g => g.playing,
  played: g => g.status === "played",
  backlog: g => g.backlog,
  wishlist: g => g.wishlist,
  dropped: g => g.status === "abandoned",
  shelved: g => g.status === "shelved",
  liked: g => g.liked,
  rated: g => g.ratingCount > 0,
}

const EMPTY_COUNTS = {
  playing: 0, played: 0, backlog: 0,
  wishlist: 0, dropped: 0, shelved: 0, liked: 0, rated: 0,
}

export function useProfileGames(profileId) {
  const [profileGames, setProfileGames] = useState({})
  const [counts, setCounts] = useState(EMPTY_COUNTS)
  const [igdbGames, setIgdbGames] = useState({})
  const [loadingGames, setLoadingGames] = useState(true)

  const fetchGames = useCallback(async () => {
    if (!profileId) return
    setLoadingGames(true)

    try {
      const res = await fetch("/api/userGames/profileGames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()

      setProfileGames(data.games || {})
      setCounts({ ...EMPTY_COUNTS, ...data.counts })

      const slugs = Object.keys(data.games || {})
      if (slugs.length === 0) return

      const batchRes = await fetch("/api/igdb?action=gamesBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      })

      if (batchRes.ok) setIgdbGames(await batchRes.json())
    } catch {
    } finally {
      setLoadingGames(false)
    }
  }, [profileId])

  useEffect(() => { fetchGames() }, [fetchGames])

  return { profileGames, counts, igdbGames, loadingGames }
}

export function filterGamesByTab(profileGames, igdbGames, tabKey) {
  const filter = TAB_FILTERS[tabKey]
  if (!filter) return []

  return Object.entries(profileGames)
    .filter(([, g]) => filter(g))
    .map(([slug]) => igdbGames[slug])
    .filter(Boolean)
    .sort((a, b) => {
      const ga = profileGames[a.slug]
      const gb = profileGames[b.slug]
      return new Date(gb?.latestAt || 0) - new Date(ga?.latestAt || 0)
    })
}
