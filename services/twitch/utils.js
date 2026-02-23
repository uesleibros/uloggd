import { TWITCH_CONFIG } from "./config.js"

const REDIRECT_URI = "https://uloggd.vercel.app/api/twitch/callback"

export function getRedirectUri() {
	return REDIRECT_URI
}

export function encodeState(data) {
	return Buffer.from(JSON.stringify(data)).toString("base64")
}

export function decodeState(state) {
	try {
		return JSON.parse(Buffer.from(state, "base64").toString())
	} catch {
		return null
	}
}

export function buildAuthUrl(clientId, redirectUri, state) {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: TWITCH_CONFIG.scopes.join(" "),
		state
	})
	return `${TWITCH_CONFIG.authUrl}?${params}`
}

export async function exchangeCode(code, redirectUri) {
	const response = await fetch(TWITCH_CONFIG.tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: process.env.TWITCH_CLIENT_ID,
			client_secret: process.env.TWITCH_CLIENT_SECRET,
			code,
			grant_type: "authorization_code",
			redirect_uri: redirectUri
		})
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Token exchange failed: ${error}`)
	}

	return response.json()
}

export async function fetchTwitchUser(accessToken) {
	const response = await fetch(`${TWITCH_CONFIG.apiUrl}/users`, {
		headers: {
			"Client-ID": process.env.TWITCH_CLIENT_ID,
			"Authorization": `Bearer ${accessToken}`
		}
	})

	if (!response.ok) {
		throw new Error("Failed to fetch Twitch user")
	}

	const data = await response.json()
	return data.data[0] || null
}
