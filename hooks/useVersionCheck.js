import { useState, useEffect, useCallback } from "react"

const CHECK_INTERVAL = 60 * 1000
const VERSION_URL = "/version.json"

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [currentVersion, setCurrentVersion] = useState(null)

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`)
      const data = await res.json()

      if (!currentVersion) {
        setCurrentVersion(data.hash)
      } else if (data.hash !== currentVersion) {
        setUpdateAvailable(true)
      }
    } catch {}
  }, [currentVersion])

  useEffect(() => {
    checkVersion()

    const interval = setInterval(checkVersion, CHECK_INTERVAL)

    return () => clearInterval(interval)
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
