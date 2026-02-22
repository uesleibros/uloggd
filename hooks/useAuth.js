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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
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
    } catch (err) {
      console.warn("[useAuth] loadUser error:", err)
      cachedUser = {
        id: session.user.id,
        discordId: session.user.user_metadata.provider_id,
        username: session.user.user_metadata.full_name,
        avatar: session.user.user_metadata.avatar_url,
        email: session.user.email,
      }
    } finally {
      authLoading = false
      loadingPromise = null
      notify()
    }
  })()

  return loadingPromise
}

async function refreshUser() {
  if (!cachedUser) return

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const res = await fetch("/api/users/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: cachedUser.id }),
    })

    if (res.ok) {
      const profile = await res.json()
      cachedUser = { ...cachedUser, ...profile }
      notify()
    }
  } catch (err) {
    console.warn("[useAuth] refreshUser error:", err)
  }
}

function updateUser(partial) {
  if (!cachedUser) return
  cachedUser = { ...cachedUser, ...partial }
  notify()
}

function resetAuth() {
  cachedUser = null
  authLoading = false
  loadingPromise = null
  notify()
}

function initialize() {
  if (initialized) return
  initialized = true

  supabase.auth.getSession()
    .then(({ data: { session }, error }) => {
      if (error) {
        console.warn("[useAuth] getSession error:", error)
        resetAuth()
        return
      }
      
      if (session) {
        loadUser(session)
      } else {
        resetAuth()
      }
    })
    .catch((err) => {
      console.error("[useAuth] getSession catch:", err)
      resetAuth()
    })

  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[useAuth] auth state change:", event)
    
    if (event === "SIGNED_OUT") {
      resetAuth()
      return
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (!session) {
        resetAuth()
        return
      }
      
      if (session.user.id !== cachedUser?.id) {
        loadUser(session)
      }
    }
  })
}

initialize()

export function useAuth() {
  const [state, setState] = useState({ user: cachedUser, loading: authLoading })

  useEffect(() => {
    const handler = (s) => setState(s)
    listeners.add(handler)
    setState({ user: cachedUser, loading: authLoading })
    return () => listeners.delete(handler)
  }, [])

  return { ...state, updateUser, refreshUser }
}
