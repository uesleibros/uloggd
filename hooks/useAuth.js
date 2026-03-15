import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

let cachedUser = null
let loading = true
let banned = null
let listeners = new Set()
let loadingPromise = null
let initialized = false

function notify() {
  listeners.forEach((fn) => fn())
}

function getSnapshot() {
  return { user: cachedUser, loading, banned }
}

let snapshotRef = getSnapshot()

function updateSnapshot() {
  const next = getSnapshot()
  if (
    next.user === snapshotRef.user &&
    next.loading === snapshotRef.loading &&
    next.banned === snapshotRef.banned
  )
    return

  snapshotRef = next
  notify()
}

function shallowEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => a[key] === b[key])
}

function mergeUser(current, updates) {
  if (!current) return updates
  if (!updates) return current
  if (shallowEqual(current, { ...current, ...updates })) return current
  return { ...current, ...updates }
}

async function fetchProfile(session) {
  try {
    const res = await fetch(`/api/users/profile?userId=${session.user.id}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
    if (res.ok) {
      const data = await res.json()
      return data
    }
    return null
  } catch {
    return null
  }
}

function buildUser(session, profile = null) {
  const { user } = session
  return {
    user_id: user.id,
    discordId: user.user_metadata.provider_id,
    username: user.user_metadata.full_name,
    avatar: user.user_metadata.avatar_url,
    email: user.email,
    ...profile,
  }
}

async function handleBan(profile) {
  banned = profile
  cachedUser = null
  loading = false
  initialized = true
  updateSnapshot()
}

async function loadUser(session, silent = false) {
  if (!session?.user) {
    cachedUser = null
    banned = null
    loading = false
    loadingPromise = null
    updateSnapshot()
    return
  }

  if (cachedUser?.user_id === session.user.id && initialized) {
    if (!silent) {
      fetchProfile(session).then(profile => {
        if (profile && !profile.is_banned) {
          const merged = mergeUser(cachedUser, profile)
          if (merged !== cachedUser) {
            cachedUser = merged
            updateSnapshot()
          }
        }
      })
    }
    loading = false
    updateSnapshot()
    return
  }

  if (loadingPromise) return loadingPromise

  if (!silent && !cachedUser) {
    loading = true
    updateSnapshot()
  }

  loadingPromise = (async () => {
    try {
      const profile = await fetchProfile(session)

      if (profile?.is_banned) {
        if (profile.expires_at && new Date(profile.expires_at) <= new Date()) {
          banned = null
          cachedUser = mergeUser(cachedUser, buildUser(session, profile))
        } else {
          await handleBan(profile)
          return
        }
      } else {
        banned = null
        const newUser = buildUser(session, profile)
        cachedUser = mergeUser(cachedUser, newUser)
      }
    } catch {
      banned = null
      const newUser = buildUser(session)
      cachedUser = mergeUser(cachedUser, newUser)
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
  banned = null
  loading = false
  initialized = true
  loadingPromise = null
  updateSnapshot()
}

export function updateUser(partial) {
  if (!cachedUser) return

  const merged = mergeUser(cachedUser, partial)
  if (merged === cachedUser) return

  cachedUser = merged
  updateSnapshot()
}

async function refreshUser() {
  if (!cachedUser) return

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return

  const profile = await fetchProfile(session)

  if (profile?.is_banned) {
    if (profile.expires_at && new Date(profile.expires_at) <= new Date()) {
      banned = null
      cachedUser = mergeUser(cachedUser, profile)
    } else {
      await handleBan(profile)
      return
    }
  } else if (profile) {
    const merged = mergeUser(cachedUser, profile)
    if (merged === cachedUser) return
    cachedUser = merged
  }

  updateSnapshot()
}

supabase.auth
  .getSession()
  .then(({ data: { session } }) => {
    return session ? loadUser(session) : reset()
  })
  .catch(() => reset())

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reset()
    return
  }

  if (event === "INITIAL_SESSION") return

  if (event === "SIGNED_IN" && session) {
    if (cachedUser?.user_id !== session.user.id) {
      initialized = false
    }
    loadUser(session)
  }

  if (event === "TOKEN_REFRESHED" && session) {
    loadUser(session, true)
  }
})

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, () => snapshotRef)
  return {
    user: snapshot.user,
    loading: snapshot.loading,
    banned: snapshot.banned,
    updateUser,
    refreshUser,
  }
}
