import { useState, useEffect, useCallback } from "react"

export function useUserLists(profileId) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchLists = useCallback(async (pageNum) => {
    if (!profileId) return
    setLoading(true)

    try {
      const r = await fetch("/api/lists/@me/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId, page: pageNum, limit: 20 }),
      })
      const data = await r.json()

      setLists(data.lists || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      setLists([])
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchLists(page)
  }, [fetchLists, page])

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  return {
    lists,
    setLists,
    loading,
    page,
    totalPages,
    total,
    handlePageChange,
    refetch: () => fetchLists(page),
  }
}