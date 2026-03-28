let cachedToken = null
let tokenExpiresAt = 0

export async function getNxapiToken() {
  const now = Date.now()

  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken
  }

  const res = await fetch("https://nxapi-auth.fancy.org.uk/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.NXAPI_CLIENT_ID,
      scope: "ll:fc",
    }),
  })

  if (!res.ok) {
    throw new Error(`nxapi auth failed: ${res.status}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000

  return cachedToken
}

export async function nxapiWebfinger(friendCode) {
  const token = await getNxapiToken()
  const formatted = friendCode.replace(/^SW-/, "").replace(/-/g, "")
  const fc = `${formatted.slice(0,4)}-${formatted.slice(4,8)}-${formatted.slice(8,12)}`

  const res = await fetch(
    `https://nxapi-auth.fancy.org.uk/.well-known/webfinger?resource=${encodeURIComponent(`https://nxapi-auth.fancy.org.uk/friendcode/${fc}`)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) return null
  return res.json()
}

export async function nxapiPresence(nsaId) {
  const token = await getNxapiToken()

  const res = await fetch(
    `https://nxapi-presence.fancy.org.uk/api/presence/${nsaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) return null
  return res.json()
}

export function generateVerificationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `NX-${code}`
}
