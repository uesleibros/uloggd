import { useState, useEffect, useCallback, useRef } from "react"

const listCache = new Map()

export function useUserLists(profileId) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const abortRef = useRef(null)

  const fetchLists = useCallback(async (pageNum) => {
    if (!profileId) return

    const cacheKey = `${profileId}-${pageNum}`

    if (listCache.has(cacheKey)) {
      const cached = listCache.get(cacheKey)
      setLists(cached.lists)
      setTotal(cached.total)
      setTotalPages(cached.totalPages)
      return
    }

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

      const result = {
        lists: data.lists || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      }

      listCache.set(cacheKey, result)

      setLists(result.lists)
      setTotal(result.total)
      setTotalPages(result.totalPages)
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
    loading,
    page,
    totalPages,
    total,
    handlePageChange,
    refetch: () => fetchLists(page),
  }
}