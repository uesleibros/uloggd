import { useState, useEffect, useCallback, useRef } from "react"

const CHECK_INTERVAL = 60 * 1000
const VERSION_URL = "/version.json"

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const currentVersionRef = useRef(null)

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`)
      const data = await res.json()

      if (!currentVersionRef.current) {
        currentVersionRef.current = data.hash
      } else if (data.hash !== currentVersionRef.current) {
        setUpdateAvailable(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    checkVersion()

    const interval = setInterval(checkVersion, CHECK_INTERVAL)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkVersion()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [checkVersion])

  const refresh = useCallback(() => {
    window.location.reload()
  }, [])

  const dismiss = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  return {
    updateAvailable,
    refresh,
    dismiss
  }
}
