import { supabase } from "#lib/supabase"

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

async function request(action, body = {}) {
  const session = await getSession()
  if (!session) return null

  const res = await fetch(`/api/users/@me/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) return null

  try {
    return await res.json()
  } catch {
    return {}
  }
}

export const uploadImage = (type, base64) =>
  request(type, {
    action: base64 === null ? "remove" : "upload",
    image: base64,
  })

export const updateBio = (bio) => request("bio", { bio })

export const updateDecoration = (decoration) => request("decoration", { decoration })

export const deleteAccount = () => request("delete")

export const signOut = () => supabase.auth.signOut()

export const updatePronoun = (pronoun) => request("pronoun", { pronoun })
