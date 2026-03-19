import { useState, useEffect, useCallback, useRef } from "react"

const CHECK_INTERVAL = 60 * 1000
const VERSION_URL = "/version.json"
const DISMISS_DURATION = 30 * 60 * 1000

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const currentVersionRef = useRef(null)
  const dismissedUntilRef = useRef(0)

  const checkVersion = useCallback(async () => {
    if (Date.now() < dismissedUntilRef.current) return

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
    dismissedUntilRef.current = Date.now() + DISMISS_DURATION
  }, [])

  return {
    updateAvailable,
    refresh,
    dismiss,
  }
}
