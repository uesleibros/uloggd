import { useEffect, useState } from "react"
import { supabase } from "#lib/supabase"

let cachedUser = null
let authLoading = true
let initialized = false
let listeners = new Set()
let loadingPromise = null

function notify() {
  listeners.forEach(fn => fn({ user: cachedUser, loading: authLoading }))
}

async function loadUser(session) {
  if (!session?.user) {
    cachedUser = null
    authLoading = false
    loadingPromise = null
    notify()
    return
  }

  if (loadingPromise) return loadingPromise

  authLoading = true
  notify()

  loadingPromise = (async () => {
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      })

      const profile = res.ok ? await res.json() : null

      cachedUser = {
        id: session.user.id,
        discordId: session.user.user_metadata.provider_id,
        username: session.user.user_metadata.full_name,
        avatar: session.user.user_metadata.avatar_url,
        email: session.user.email,
        ...profile,
      }
    } catch {
      cachedUser = {
        id: session.user.id,
        discordId: session.user.user_metadata.provider_id,
        username: session.user.user_metadata.full_name,
        avatar: session.user.user_metadata.avatar_url,
        email: session.user.email,
      }
    }

    authLoading = false
    loadingPromise = null
    notify()
  })()

  return loadingPromise
}

function updateUser(partial) {
  if (!cachedUser) return
  cachedUser = { ...cachedUser, ...partial }
  notify()
}

if (!initialized) {
  initialized = true

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      cachedUser = null
      authLoading = false
      loadingPromise = null
      notify()
      return
    }

    if (cachedUser && session?.user?.id === cachedUser.id) return

    loadUser(session)
  })
}

export function useAuth() {
  const [state, setState] = useState({ user: cachedUser, loading: authLoading })

  useEffect(() => {
    const handler = (s) => setState(s)
    listeners.add(handler)
    setState({ user: cachedUser, loading: authLoading })
    return () => listeners.delete(handler)
  }, [])

  return { ...state, updateUser }
}
