import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

let cachedUser = null
let authLoading = true
let initialized = false
let listeners = new Set()

function notify() {
  listeners.forEach(fn => fn({ user: cachedUser, loading: authLoading }))
}

async function loadUser(session) {
  if (!session?.user) {
    cachedUser = null
    authLoading = false
    notify()
    return
  }

  try {
    const res = await fetch("/api/user/profile", {
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
      banner: profile?.banner || null,
      is_verified: profile?.is_verified || false,
      is_moderator: profile?.is_moderator || false,
    }
  } catch {
    cachedUser = {
      id: session.user.id,
      discordId: session.user.user_metadata.provider_id,
      username: session.user.user_metadata.full_name,
      avatar: session.user.user_metadata.avatar_url,
      email: session.user.email,
      banner: null,
      is_verified: false,
      is_moderator: false,
    }
  }

  authLoading = false
  notify()
}

if (!initialized) {
  initialized = true

  supabase.auth.getSession().then(({ data: { session } }) => {
    loadUser(session)
  })

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      cachedUser = null
      authLoading = false
      notify()
      return
    }

    if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      if (cachedUser && session?.user?.id === cachedUser.id) return
    }

    if (event === "SIGNED_IN" && cachedUser?.id === session?.user?.id) return

    authLoading = true
    notify()
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

  return state
}