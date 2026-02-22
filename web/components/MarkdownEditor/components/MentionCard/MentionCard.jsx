import { useState, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { LoadingSkeleton } from "./LoadingSkeleton"
import { ErrorState } from "./ErrorState"
import { ProfileContent } from "./ProfileContent"

export function MentionCard({ username, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true))
    })
  }, [])

  const handleClose = useCallback(() => {
    setMounted(false)
    setTimeout(onClose, 150)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()

    fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setProfile(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(true)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [username])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleClose])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPadding = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPadding
    }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-150 ${
        mounted ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className={`relative bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50 overflow-hidden transition-all duration-150 ${
          mounted ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-black/60 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {loading && <LoadingSkeleton />}
        {error && <ErrorState username={username} onClose={handleClose} />}
        {profile && <ProfileContent profile={profile} />}
      </div>
    </div>,
    document.body
  )
}
