import crypto from "crypto"

let cachedToken = null
let tokenExpiresAt = 0

const SIGN_SECRET = process.env.NXAPI_CLIENT_ID

export function signVerificationData(data) {
	const payload = JSON.stringify(data)
	const sig = crypto.createHmac("sha256", SIGN_SECRET).update(payload).digest("hex")
	return Buffer.from(JSON.stringify({ d: data, s: sig })).toString("base64url")
}

export function verifySignedData(token) {
	try {
		const { d, s } = JSON.parse(Buffer.from(token, "base64url").toString())
		const expected = crypto.createHmac("sha256", SIGN_SECRET).update(JSON.stringify(d)).digest("hex")
		if (s !== expected) return null
		if (Date.now() - d.createdAt > 10 * 60 * 1000) return null
		return d
	} catch {
		return null
	}
}

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
	const cleaned = friendCode.replace(/^SW-/, "").replace(/-/g, "")
	const fc = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`

	const res = await fetch(
		`https://nxapi-auth.fancy.org.uk/.well-known/webfinger?resource=${encodeURIComponent(`https://nxapi-auth.fancy.org.uk/friendcode/${fc}`)}&_t=${Date.now()}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				"Cache-Control": "no-cache",
			},
		}
	)

	if (!res.ok) return null
	return res.json()
}

export async function nxapiPresence(nsaId) {
	const token = await getNxapiToken()
	
	const res = await fetch(
		`https://nxapi-presence.fancy.org.uk/api/presence/${nsaId}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				"Cache-Control": "no-cache",
			},
		}
	)

	if (!res.ok) {
		if (res.status === 404) return null
		throw new Error(`nxapi presence failed: ${res.status}`)
	}

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

export function normalizeSwitchCode(code) {
	if (!code || typeof code !== "string") return null
	const cleaned = code.replace(/[^\d]/g, "")
	if (cleaned.length !== 12) return null
	return `SW-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`
}