import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

if (typeof window !== "undefined") {
  const url = new URL(window.location.href)
  if (url.searchParams.has("code") || url.searchParams.has("error") || url.searchParams.has("state")) {
    url.searchParams.delete("code")
    url.searchParams.delete("error")
    url.searchParams.delete("state")
    window.history.replaceState({}, document.title, url.pathname + url.search)
  }
}

let cachedUser = null
let loading = true
let listeners = new Set()
let currentLoadId = 0
let initialized = false

function notify() {
  listeners.forEach(fn => fn())
}

let snapshotRef = { user: null, loading: true }

function updateSnapshot() {
  const next = { user: cachedUser, loading }
  if (next.user === snapshotRef.user && next.loading === snapshotRef.loading) return
  snapshotRef = next
  notify()
}

async function safeGetSession() {
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 2000))
    ])
    return { data, error }
  } catch (err) {
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          try {
            const fallbackSession = JSON.parse(localStorage.getItem(key))
            if (fallbackSession?.access_token) {
              return { data: { session: fallbackSession }, error: null }
            }
          } catch (e) {}
        }
      }
    }
    return { data: { session: null }, error: err }
  }
}

async function fetchProfile(session) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch("/api/users/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: session.user.id }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok ? await res.json() : null
  } catch {
    clearTimeout(timeout)
    return null
  }
}

function buildUser(session, profile = null) {
  const { user } = session
  return {
    id: user.id,
    discordId: user.user_metadata?.provider_id,
    username: user.user_metadata?.full_name,
    avatar: user.user_metadata?.avatar_url,
    email: user.email,
    ...profile,
  }
}

async function loadUser(session) {
  if (!session?.user) {
    cachedUser = null
    loading = false
    currentLoadId = 0
    updateSnapshot()
    return
  }

  if (cachedUser?.id === session.user.id && initialized) {
    loading = false
    updateSnapshot()
    return
  }

  const myId = ++currentLoadId
  loading = true
  updateSnapshot()

  try {
    const profile = await fetchProfile(session)
    if (myId !== currentLoadId) return
    cachedUser = buildUser(session, profile)
  } catch {
    if (myId !== currentLoadId) return
    cachedUser = buildUser(session)
  } finally {
    if (myId !== currentLoadId) return
    loading = false
    initialized = true
    updateSnapshot()
  }
}

function reset() {
  cachedUser = null
  loading = false
  initialized = true
  currentLoadId = 0
  updateSnapshot()
}

export function updateUser(partial) {
  if (!cachedUser) return
  const hasChanges = Object.keys(partial).some((key) => cachedUser[key] !== partial[key])
  if (!hasChanges) return
  cachedUser = { ...cachedUser, ...partial }
  updateSnapshot()
}

export async function refreshUser() {
  if (!cachedUser) return
  const { data: { session } } = await safeGetSession()
  if (!session?.access_token) return
  const profile = await fetchProfile(session)
  if (profile) {
    cachedUser = { ...cachedUser, ...profile }
    updateSnapshot()
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reset()
    return
  }
  if (event === "INITIAL_SESSION") return
  if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    if (cachedUser?.id !== session.user.id) {
      initialized = false
    }
    loadUser(session)
  }
})

safeGetSession().then(({ data: { session } }) => {
  return session ? loadUser(session) : reset()
}).catch(() => reset())

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, () => snapshotRef)
  return {
    user: snapshot.user,
    loading: snapshot.loading,
    updateUser,
    refreshUser,
  }
}
