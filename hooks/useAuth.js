import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

let cachedUser = null
let loading = true
let banned = null
let listeners = new Set()
let loadingPromise = null
let initialized = false

function notify() {
  listeners.forEach(fn => fn())
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
  ) return

  snapshotRef = next
  notify()
}

async function fetchProfile(session) {
  try {
    const res = await fetch(`/api/users/profile?userId=${session.user.id}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
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

  if (cachedUser?.id === session.user.id && initialized) {
    loading = false
    updateSnapshot()
    return
  }

  if (loadingPromise) return loadingPromise

  if (!silent) {
    loading = true
    updateSnapshot()
  }

  loadingPromise = (async () => {
    try {
      const profile = await fetchProfile(session)

      if (profile?.is_banned) {
        if (profile.expires_at && new Date(profile.expires_at) <= new Date()) {
          banned = null
          cachedUser = buildUser(session, profile)
        } else {
          await handleBan(profile)
          return
        }
      } else {
        banned = null
        cachedUser = buildUser(session, profile)
      }
    } catch {
      banned = null
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
  banned = null
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

  if (profile?.is_banned) {
    if (profile.expires_at && new Date(profile.expires_at) <= new Date()) {
      banned = null
      cachedUser = { ...cachedUser, ...profile }
    } else {
      await handleBan(profile)
      return
    }
  } else if (profile) {
    cachedUser = { ...cachedUser, ...profile }
  }

  updateSnapshot()
}

supabase.auth.getSession()
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
    if (cachedUser?.id !== session.user.id) {
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


