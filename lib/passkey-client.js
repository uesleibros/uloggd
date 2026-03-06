import { startRegistration, startAuthentication } from "@simplewebauthn/browser"

export async function registerPasskey(accessToken, deviceName) {
  try {
    const optionsRes = await fetch("/api/passkey/register-generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!optionsRes.ok) {
      const error = await optionsRes.json()
      throw new Error(error.error || "Failed to generate options")
    }

    const options = await optionsRes.json()

    const response = await startRegistration(options)

    const verifyRes = await fetch("/api/passkey/register-verify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ response, deviceName }),
    })

    if (!verifyRes.ok) {
      const error = await verifyRes.json()
      throw new Error(error.error || "Failed to verify registration")
    }

    return await verifyRes.json()
  } catch (error) {
    console.error("Passkey registration error:", error)
    throw error
  }
}

export async function authenticateWithPasskey() {
  try {
    const optionsRes = await fetch("/api/passkey/auth-generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!optionsRes.ok) {
      const error = await optionsRes.json()
      throw new Error(error.error || "Failed to generate options")
    }

    const options = await optionsRes.json()

    const response = await startAuthentication(options)

    const verifyRes = await fetch("/api/passkey/auth-verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        response, 
        authId: options.authId 
      }),
    })

    if (!verifyRes.ok) {
      const error = await verifyRes.json()
      throw new Error(error.error || "Failed to verify authentication")
    }

    return await verifyRes.json()
  } catch (error) {
    console.error("Passkey authentication error:", error)
    throw error
  }
}

export async function listPasskeys(accessToken) {
  const res = await fetch("/api/passkey/list", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to list passkeys")
  }
  
  return await res.json()
}

export async function removePasskey(accessToken, passkeyId) {
  const res = await fetch("/api/passkey/remove", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ passkeyId }),
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to remove passkey")
  }
  
  return await res.json()
}