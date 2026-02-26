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

    fetch(`/api/igdb/game?slug=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found")
        return res.json()
      })
      .then((data) => {
        setGame(data)
        setLoading(false)

        const params = new URLSearchParams({
          name: data.name,
        })

        if (data.alternative_names?.length > 0) {
          params.append('altNames', JSON.stringify(data.alternative_names.map(a => a.name)))
        }

        if (data.first_release_date) {
          params.append('year', new Date(data.first_release_date * 1000).getFullYear())
        }

        fetch(`/api/howlongtobeat/search?${params}`)
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