import { useSyncExternalStore, useCallback } from "react"
import { supabase } from "#lib/supabase"

let cachedUser = null
let loading = true
let listeners = new Set()
let loadingPromise = null
let initialized = false

function notify() {
  listeners.forEach(fn => fn())
}

function getSnapshot() {
  return { user: cachedUser, loading }
}

let snapshotRef = getSnapshot()

function updateSnapshot() {
  const next = getSnapshot()
  if (next.user === snapshotRef.user && next.loading === snapshotRef.loading) return
  snapshotRef = next
  notify()
}

async function fetchProfile(session) {
  try {
    const res = await fetch("/api/users/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: session.user.id }),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

function buildUser(session, profile = null) {
  const { user } = session
  return {
    id: user.id,
    discordId: user.user_metadata.provider_id,
    username: user.user_metadata.full_name,
    avatar: user.user_metadata.avatar_url,
    email: user.email,
    ...profile,
  }
}

async function loadUser(session) {
  if (!session?.user) {
    cachedUser = null
    loading = false
    loadingPromise = null
    updateSnapshot()
    return
  }

  if (cachedUser?.id === session.user.id && initialized) {
    loading = false
    updateSnapshot()
    return
  }

  if (loadingPromise) return loadingPromise

  loading = true
  updateSnapshot()

  loadingPromise = (async () => {
    try {
      const profile = await fetchProfile(session)
      cachedUser = buildUser(session, profile)
    } catch {
      cachedUser = buildUser(session)
    } finally {
      loading = false
      initialized = true
      loadingPromise = null
      updateSnapshot()
    }
  })()

  return loadingPromise
}

function reset() {
  cachedUser = null
  loading = false
  initialized = true
  loadingPromise = null
  updateSnapshot()
}

export function updateUser(partial) {
  if (!cachedUser) return

  const hasChanges = Object.keys(partial).some(
    (key) => cachedUser[key] !== partial[key]
  )

  if (!hasChanges) return

  cachedUser = { ...cachedUser, ...partial }
  updateSnapshot()
}

async function refreshUser() {
  if (!cachedUser) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return
  const profile = await fetchProfile(session)
  if (profile) {
    cachedUser = { ...cachedUser, ...profile }
    updateSnapshot()
  }
}

async function ensureUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session && !cachedUser) {
    initialized = false
    await loadUser(session)
  }
}

supabase.auth.getSession().then(({ data: { session } }) => {
  return session ? loadUser(session) : reset()
}).catch(() => reset())

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reset()
    return
  }

  if (event === "INITIAL_SESSION") return

  if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    if (cachedUser?.id !== session.user.id) {
      initialized = false
      loadUser(session)
    }
  }
})

if (typeof window !== "undefined") {
  window.addEventListener("focus", ensureUser)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") ensureUser()
  })
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) ensureUser()
  })
}

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
