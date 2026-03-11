import { useState, useEffect, useCallback } from "react"

export function useUserJourneys(userId) {
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchJourneys = useCallback(async (pageNum, signal) => {
    if (!userId) return
    setLoading(true)

    try {
      const res = await fetch(
        `/api/journeys/byUser?userId=${userId}&page=${pageNum}&limit=12`,
        { signal }
      )

      if (res.ok && !signal?.aborted) {
        const data = await res.json()
        setJourneys(data.journeys || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (e) {
      if (e?.name === "AbortError") return
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const ac = new AbortController()
    setPage(1)
    fetchJourneys(1, ac.signal)
    return () => ac.abort()
  }, [fetchJourneys])

  function handlePageChange(newPage) {
    setPage(newPage)
    fetchJourneys(newPage)
  }

  return {
    journeys,
    loading,
    total,
    page,
    totalPages,
    handlePageChange,
  }
}
