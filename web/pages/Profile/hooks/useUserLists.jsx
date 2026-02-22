import { useState, useEffect } from "react"

export function useUserLists(profileId) {
  const [userLists, setUserLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(false)

  useEffect(() => {
    if (!profileId) return
    setLoadingLists(true)

    const controller = new AbortController()

    fetch("/api/lists/@me/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profileId }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setUserLists(Array.isArray(data) ? data : [])
        setLoadingLists(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoadingLists(false)
      })

    return () => controller.abort()
  }, [profileId])

  return { userLists, setUserLists, loadingLists }
}