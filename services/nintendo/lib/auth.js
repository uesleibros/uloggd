import crypto from "crypto"

const CLIENT_ID = "71b963c1b7b6d119"

function base64URLEncode(buffer) {
	return buffer.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "")
}

function generateVerifier() {
	return base64URLEncode(crypto.randomBytes(32))
}

function generateChallenge(verifier) {
	return base64URLEncode(crypto.createHash("sha256").update(verifier).digest())
}

function generateState() {
	return base64URLEncode(crypto.randomBytes(36))
}

export function getNintendoAuthUrl() {
	const verifier = generateVerifier()
	const challenge = generateChallenge(verifier)
	const state = generateState()

	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: "npf71b963c1b7b6d119://auth",
		response_type: "session_token_code",
		scope: "openid user user.birthday user.mii user.screenName",
		session_token_code_challenge: challenge,
		session_token_code_challenge_method: "S256",
		state,
	})

	return {
		url: `https://accounts.nintendo.com/connect/1.0.0/authorize?${params}`,
		verifier,
		state,
	}
}

export async function getNintendoToken(code, verifier) {
	const res = await fetch("https://accounts.nintendo.com/connect/1.0.0/api/session_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "OnlineLounge/2.10.1 NASDKAPI Android",
		},
		body: new URLSearchParams({
			client_id: CLIENT_ID,
			session_token_code: code,
			session_token_code_verifier: verifier,
		}),
	})

	if (!res.ok) {
		throw new Error("Failed to get session token")
	}

	const data = await res.json()
	return data.session_token
}

export async function getNintendoUser(sessionToken) {
	const tokenRes = await fetch("https://accounts.nintendo.com/connect/1.0.0/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "OnlineLounge/2.10.1 NASDKAPI Android",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			session_token: sessionToken,
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
		}),
	})

	if (!tokenRes.ok) {
		throw new Error("Failed to get access token")
	}

	const tokenData = await tokenRes.json()

	const userRes = await fetch("https://api.accounts.nintendo.com/2.0.0/users/me", {
		headers: {
			"Authorization": `Bearer ${tokenData.access_token}`,
			"User-Agent": "OnlineLounge/2.10.1 NASDKAPI Android",
		},
	})

	if (!userRes.ok) {
		throw new Error("Failed to get user info")
	}

	const userData = await userRes.json()

	return {
		id: userData.id,
		nickname: userData.nickname,
		imageUri: userData.mii?.imageUriTemplate?.replace("{width}", "200").replace("{height}", "200") || null,
	}
}