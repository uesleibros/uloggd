import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

let state = { user: null, loading: true }
let listeners = new Set()
let loadingPromise = null
let safetyTimer = null

function notify() {
  listeners.forEach(fn => fn())
}

function getSnapshot() {
  return state
}

function setState(next) {
  if (state.user === next.user && state.loading === next.loading) return
  state = next
  notify()
}

function clearSafetyTimer() {
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
}

function startSafetyTimer() {
  clearSafetyTimer()
  safetyTimer = setTimeout(() => {
    if (state.loading) {
      loadingPromise = null
      init()
    }
  }, 5000)
}

async function fetchProfile(session) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

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
    clearTimeout(timeoutId)
    return res.ok ? await res.json() : null
  } catch {
    clearTimeout(timeoutId)
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
    loadingPromise = null
    clearSafetyTimer()
    setState({ user: null, loading: false })
    return
  }

  if (state.user?.id === session.user.id && !state.loading) {
    return
  }

  if (loadingPromise) return loadingPromise

  setState({ ...state, loading: true })
  startSafetyTimer()

  loadingPromise = (async () => {
    try {
      const profile = await fetchProfile(session)
      setState({ user: buildUser(session, profile), loading: false })
    } catch {
      setState({ user: buildUser(session), loading: false })
    } finally {
      loadingPromise = null
      clearSafetyTimer()
    }
  })()

  return loadingPromise
}

async function init() {
  loadingPromise = null
  setState({ ...state, loading: true })
  startSafetyTimer()

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      try {
        const { data: refreshData } = await supabase.auth.refreshSession()
        if (refreshData?.session) {
          await loadUser(refreshData.session)
          return
        }
      } catch {}
      clearSafetyTimer()
      setState({ user: null, loading: false })
      return
    }

    if (data?.session) {
      await loadUser(data.session)
    } else {
      clearSafetyTimer()
      setState({ user: null, loading: false })
    }
  } catch {
    clearSafetyTimer()
    setState({ user: null, loading: false })
  }
}

init()

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    loadingPromise = null
    clearSafetyTimer()
    setState({ user: null, loading: false })
  } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    loadUser(session)
  }
})

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      loadingPromise = null
      init()
    }
  })

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return

    if (state.loading) {
      loadingPromise = null
      init()
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session && state.user) {
        setState({ user: null, loading: false })
      } else if (data?.session && !state.user) {
        loadUser(data.session)
      }
    })
  })

  let lastUrl = window.location.href
  window.addEventListener("popstate", () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      if (state.loading) {
        loadingPromise = null
        init()
      }
    }
  })
}

export function updateUser(partial) {
  if (!state.user) return
  setState({ user: { ...state.user, ...partial }, loading: false })
}

export async function refreshUser() {
  const { data } = await supabase.auth.getSession()
  if (data?.session) {
    loadingPromise = null
    await loadUser(data.session)
  }
}

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  return {
    user: snapshot.user,
    loading: snapshot.loading,
    updateUser,
    refreshUser,
  }
}
