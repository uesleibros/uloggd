import { useState, useEffect } from "react"

export function useGameData(slug) {
  const [game, setGame] = useState(null)
  const [hltb, setHltb] = useState(null)
  const [hltbLoading, setHltbLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setGame(null)
    setHltb(null)
    setHltbLoading(true)

    fetch(`/api/igdb/game?slug=${encodeURIComponent(slug)}`)
      .then(res => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then(data => {
        if (cancelled) return

        setGame(data)
        setLoading(false)

        const params = new URLSearchParams({ name: data.name })

        if (data.alternative_names?.length > 0) {
          params.set("altNames", JSON.stringify(data.alternative_names.map(a => a.name)))
        }

        if (data.first_release_date) {
          params.set("year", new Date(data.first_release_date * 1000).getFullYear())
        }

        fetch(`/api/howlongtobeat/search?${params}`)
          .then(r => r.ok ? r.json() : null)
          .then(h => { if (!cancelled) { setHltb(h); setHltbLoading(false) } })
          .catch(() => { if (!cancelled) { setHltb(null); setHltbLoading(false) } })
      })
      .catch(() => {
        if (!cancelled) {
          setError("not found")
          setLoading(false)
          setHltbLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [slug])

  return { game, hltb, hltbLoading, loading, error }
}
