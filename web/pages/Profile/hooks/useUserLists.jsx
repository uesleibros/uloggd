import { useState, useEffect, useCallback, useRef } from "react"

export function useUserLists(profileId) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const abortRef = useRef(null)

  const fetchLists = useCallback(async (pageNum) => {
    if (!profileId) return

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)

    try {
      const params = new URLSearchParams({
        userId: profileId,
        page: pageNum,
        limit: 20,
      })

      const r = await fetch(`/api/lists/@me/get?${params}`, {
        signal: controller.signal,
      })

      const data = await r.json()

      if (controller.signal.aborted) return

      setLists(data.lists || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      if (!controller.signal.aborted) {
        setLists([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
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
