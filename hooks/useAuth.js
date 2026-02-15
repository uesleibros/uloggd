import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

let cachedUser = null
let listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(cachedUser))
}

async function loadUser(session) {
  if (!session?.user) {
    cachedUser = null
    notify()
    return
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified, is_moderator")
    .eq("user_id", session.user.id)
    .single()

  cachedUser = {
    id: session.user.id,
    discordId: session.user.user_metadata.provider_id,
    username: session.user.user_metadata.full_name,
    avatar: session.user.user_metadata.avatar_url,
    email: session.user.email,
    is_verified: profile?.is_verified || false,
    is_moderator: profile?.is_moderator || false,
  }

  notify()
}

supabase.auth.getSession().then(({ data: { session } }) => {
  loadUser(session)
})

supabase.auth.onAuthStateChange((event, session) => {
  loadUser(session)
})

export function useAuth() {
  const [user, setUser] = useState(cachedUser)

  useEffect(() => {
    const handler = (u) => setUser(u)
    listeners.add(handler)
    setUser(cachedUser)
    return () => listeners.delete(handler)
  }, [])

  return { user }
}