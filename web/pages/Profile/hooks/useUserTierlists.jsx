import { useState, useEffect, useCallback, useRef } from "react"

const tierlistCache = new Map()

export function useUserTierlists(profileId) {
  const [tierlists, _setTierlists] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [version, setVersion] = useState(0)

  const abortRef = useRef(null)

  const fetchTierlists = useCallback(async (pageNum, force = false) => {
    if (!profileId) return

    const cacheKey = `${profileId}-${pageNum}`

    if (!force && tierlistCache.has(cacheKey)) {
      const cached = tierlistCache.get(cacheKey)
      _setTierlists(cached.tierlists)
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
        limit: 12,
      })

      const r = await fetch(`/api/tierlists/list?${params}`, {
        signal: controller.signal,
      })

      const data = await r.json()

      if (controller.signal.aborted) return

      const result = {
        tierlists: data.tierlists || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
      }

      tierlistCache.set(cacheKey, result)

      _setTierlists(result.tierlists)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch {
      if (!controller.signal.aborted) {
        _setTierlists([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [profileId])

  useEffect(() => {
    if (!profileId) return
    tierlistCache.clear()
    setPage(1)
    fetchTierlists(1, true)
  }, [profileId])

  useEffect(() => {
    if (!profileId) return
    fetchTierlists(page)
  }, [page, version])

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  const setTierlists = useCallback((updater) => {
    _setTierlists(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      return next
    })
    setVersion(v => v + 1)
  }, [])

  return {
    tierlists,
    setTierlists,
    loading,
    page,
    totalPages,
    total,
    handlePageChange,
  }
}
