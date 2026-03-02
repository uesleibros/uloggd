import { useState, useEffect } from "react"

export function useUserTransactions(userId) {
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    setLoading(true)

    fetch(`/api/transactions/list?userId=${userId}&page=1&limit=1`)
      .then((r) => r.ok ? r.json() : {})
      .then((data) => {
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  return { total, loading }
}