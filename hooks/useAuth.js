import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

let cachedUser = null
let loading = true
let listeners = new Set()

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
    updateSnapshot()
    return
  }

  loading = true
  updateSnapshot()

  try {
    const profile = await fetchProfile(session)
    cachedUser = buildUser(session, profile)
  } catch (err) {
    console.error("Profile load failed", err)
    cachedUser = null
  } finally {
    loading = false
    updateSnapshot()
  }
}

function reset() {
  cachedUser = null
  loading = false
  updateSnapshot()
}

export function updateUser(partial) {
  if (!cachedUser) return
  cachedUser = { ...cachedUser, ...partial }
  updateSnapshot()
}

async function refreshUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) await loadUser(session)
}

(async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error("Session error", error)
      await supabase.auth.signOut()
      reset()
      return
    }

    if (data?.session) {
      await loadUser(data.session)
    } else {
      reset()
    }
  } catch (err) {
    console.error("Init error", err)
    reset()
  }
})()

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reset()
  } else if (event === "SIGNED_IN" && session) {
    loadUser(session)
  }
})

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      window.location.reload()
    }
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
