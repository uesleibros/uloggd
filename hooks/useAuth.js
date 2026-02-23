import { useSyncExternalStore } from "react"
import { supabase } from "#lib/supabase"

const INITIAL_STATE = { user: null, loading: true }

let state = { ...INITIAL_STATE }
let listeners = new Set()
let loadingPromise = null

function notify() {
  listeners.forEach(fn => fn())
}

function getSnapshot() {
  return state
}

function setState(newState) {
  if (state.user === newState.user && state.loading === newState.loading) return
  state = newState
  notify()
}

async function fetchProfile(session) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const res = await fetch("/api/users/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: session.user.id }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return res.ok ? await res.json() : null
  } catch (e) {
    clearTimeout(timeoutId)
    console.error("Profile fetch error:", e)
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
    setState({ user: null, loading: false })
    return
  }

  if (state.user?.id === session.user.id && !state.loading) {
    return
  }

  if (loadingPromise) return loadingPromise

  setState({ ...state, loading: true })

  loadingPromise = (async () => {
    try {
      const profile = await fetchProfile(session)
      const user = buildUser(session, profile)
      setState({ user, loading: false })
    } catch (e) {
      const user = buildUser(session)
      setState({ user, loading: false })
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

function init() {
  loadingPromise = null
  
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session) {
      loadUser(data.session)
    } else {
      setState({ user: null, loading: false })
    }
  }).catch(() => {
    setState({ user: null, loading: false })
  })
}

init()

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    loadingPromise = null
    setState({ user: null, loading: false })
  } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    if (session) loadUser(session)
  }
})

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted || state.loading) {
      console.log("Page restored, re-initializing auth...")
      loadingPromise = null
      init()
    }
  })

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (state.loading) {
        loadingPromise = null
        init()
      } else {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session && state.user?.id !== data.session.user.id) {
            loadUser(data.session)
          }
        })
      }
    }
  })
}

export function updateUser(partial) {
  if (!state.user) return
  setState({
    ...state,
    user: { ...state.user, ...partial }
  })
}

export async function refreshUser() {
  const { data } = await supabase.auth.getSession()
  if (data?.session) {
    loadingPromise = null // Força recarregamento
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
