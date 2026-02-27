import { useState, useEffect, useCallback, useRef } from "react"

export function useUserTierlists(profileId) {
  const [tierlists, setTierlists] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const abortRef = useRef(null)

  const fetchTierlists = useCallback(async (pageNum) => {
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
        limit: 12,
      })

      const r = await fetch(`/api/tierlists/list?${params}`, {
        signal: controller.signal,
      })

      const data = await r.json()

      if (controller.signal.aborted) return

      setTierlists(data.tierlists || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      if (!controller.signal.aborted) {
        setTierlists([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [profileId])

  useEffect(() => {
    fetchTierlists(page)
  }, [fetchTierlists, page])

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  return {
    tierlists,
    setTierlists,
    loading,
    page,
    totalPages,
    total,
    setTotal,
    handlePageChange,
  }
}
