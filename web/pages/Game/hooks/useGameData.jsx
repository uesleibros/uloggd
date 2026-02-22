import { useState, useEffect } from "react"

export function useGameData(slug) {
  const [game, setGame] = useState(null)
  const [hltb, setHltb] = useState(null)
  const [hltbLoading, setHltbLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setHltb(null)
    setHltbLoading(true)

    fetch("/api/igdb/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then((data) => {
        setGame(data)
        setLoading(false)

        fetch("/api/howlongtobeat/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            altNames: data.alternative_names?.map((a) => a.name) || [],
            year: data.first_release_date
              ? new Date(data.first_release_date * 1000).getFullYear()
              : null,
            platforms: data.platforms?.map((p) => p.name) || null,
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((h) => {
            setHltb(h)
            setHltbLoading(false)
          })
          .catch(() => {
            setHltb(null)
            setHltbLoading(false)
          })
      })
      .catch(() => {
        setError("Jogo não encontrado")
        setLoading(false)
      })
  }, [slug])

  return { game, hltb, hltbLoading, loading, error }
}