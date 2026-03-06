import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server"
import { supabase } from "#lib/supabase-ssr.js"

const RP_NAME = "uloggd"

const APP_URL = new URL(process.env.APP_URL)
const RP_ID = APP_URL.hostname
const ORIGIN = APP_URL.origin

export async function saveChallenge(key, challenge) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  
  await supabase
    .from("passkey_challenges")
    .upsert({
      key,
      challenge,
      expires_at: expiresAt.toISOString()
    })
}

export async function getChallenge(key) {
  const { data } = await supabase
    .from("passkey_challenges")
    .select("challenge")
    .eq("key", key)
    .gt("expires_at", new Date().toISOString())
    .single()
  
  await supabase
    .from("passkey_challenges")
    .delete()
    .eq("key", key)
  
  return data?.challenge
}

export async function generateRegistration(userId, username, existingPasskeys = []) {
  const userIdBytes = new TextEncoder().encode(userId)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userIdBytes,
    userName: username,
    userDisplayName: username,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map(pk => ({
      id: Buffer.from(pk.credential_id, "base64url"),
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  })

  await saveChallenge(`reg_${userId}`, options.challenge)

  return options
}

export async function verifyRegistration(userId, response) {
  const expectedChallenge = await getChallenge(`reg_${userId}`)
  if (!expectedChallenge) {
    throw new Error("Challenge expired or not found")
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  })

  if (!verification.verified) {
    throw new Error("Verification failed")
  }

  return verification.registrationInfo
}

export async function generateAuthentication() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  })

  const authId = crypto.randomUUID()
  await saveChallenge(`auth_${authId}`, options.challenge)

  return { ...options, authId }
}

export async function verifyAuthentication(authId, response, passkey) {
  const expectedChallenge = await getChallenge(`auth_${authId}`)
  if (!expectedChallenge) {
    throw new Error("Challenge expired or not found")
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(passkey.credential_id, "base64url"),
      credentialPublicKey: Buffer.from(passkey.public_key, "base64url"),
      counter: passkey.counter,
    },
  })

  if (!verification.verified) {
    throw new Error("Verification failed")
  }

  return verification.authenticationInfo
}

export { RP_ID, ORIGIN }