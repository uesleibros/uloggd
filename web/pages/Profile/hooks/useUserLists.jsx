import { useState, useEffect } from "react"

export function useUserLists(profileId) {
  const [userLists, setUserLists] = useState([])
  const [loadingLists, setLoadingLists] = useState(false)

  useEffect(() => {
    if (!profileId) {
      setUserLists([])
      setLoadingLists(false)
      return
    }

    setLoadingLists(true)
    const controller = new AbortController()

    fetch("/api/lists/@me/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profileId }),
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setUserLists(Array.isArray(data) ? data : [])
        setLoadingLists(false)
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setUserLists([])
          setLoadingLists(false)
        }
      })

    return () => controller.abort()
  }, [profileId])

  return { userLists, setUserLists, loadingLists }
}
