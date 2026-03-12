import { supabase } from "#lib/supabase-ssr.js"

const PSN_CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891"
const PSN_CLIENT_SECRET = "ucPjka5tntB2KqsP"
const PSN_AUTH_URL = "https://ca.account.sony.com/api/authz/v3/oauth"
const PSN_API_URL = "https://m.np.playstation.com/api"

async function exchangeNpssoForCode(npsso) {
	const params = new URLSearchParams({
		access_type: "offline",
		client_id: PSN_CLIENT_ID,
		response_type: "code",
		redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
		scope: "psn:mobile.v2.core psn:clientapp"
	})

	const response = await fetch(`${PSN_AUTH_URL}/authorize?${params}`, {
		headers: {
			Cookie: `npsso=${npsso}`
		},
		redirect: "manual"
	})

	const location = response.headers.get("location")
	
	if (!location) {
		throw new Error("Failed to get authorization code")
	}

	const url = new URL(location)
	const code = url.searchParams.get("code")

	if (!code) {
		throw new Error("No code in redirect")
	}

	return code
}

async function exchangeCodeForTokens(code) {
	const response = await fetch(`${PSN_AUTH_URL}/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${PSN_CLIENT_ID}:${PSN_CLIENT_SECRET}`).toString("base64")}`
		},
		body: new URLSearchParams({
			code,
			grant_type: "authorization_code",
			redirect_uri: "com.scee.psxandroid.scecompcall://redirect"
		})
	})

	const data = await response.json()

	if (!response.ok) {
		throw new Error(data.error_description || "Failed to get tokens")
	}

	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in
	}
}

async function getProfile(accessToken) {
	const response = await fetch(`${PSN_API_URL}/userProfile/v1/internal/users/me/profiles`, {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	})

	const data = await response.json()

	if (!response.ok) {
		throw new Error("Failed to get profile")
	}

	return {
		accountId: data.accountId,
		onlineId: data.onlineId,
		avatarUrl: data.avatars?.[0]?.url || null,
		isPlus: data.isPlus || false,
		aboutMe: data.aboutMe || null
	}
}

export async function handleConnect(req, res) {
	const { userId, npssoToken } = req.body

	if (!userId || !npssoToken) {
		return res.status(400).json({ error: "userId and npssoToken required" })
	}

	try {
		const code = await exchangeNpssoForCode(npssoToken)
		const authorization = await exchangeCodeForTokens(code)
		const profile = await getProfile(authorization.accessToken)

		const expiresAt = new Date(Date.now() + authorization.expiresIn * 1000).toISOString()

		await supabase
			.from("user_connections")
			.upsert({
				user_id: userId,
				provider: "psn",
				provider_user_id: profile.accountId,
				provider_username: profile.onlineId,
				provider_display_name: profile.onlineId,
				provider_avatar_url: profile.avatarUrl,
				access_token: authorization.accessToken,
				refresh_token: authorization.refreshToken,
				token_expires_at: expiresAt,
				extra_data: {
					isPlus: profile.isPlus,
					aboutMe: profile.aboutMe
				},
				connected_at: new Date().toISOString()
			}, { onConflict: "user_id, provider" })

		res.json({
			success: true,
			profile: {
				onlineId: profile.onlineId,
				avatar: profile.avatarUrl,
				isPlus: profile.isPlus
			}
		})
	} catch (error) {
		console.error("Erro ao conectar PSN:", error.message)
		res.status(401).json({
			success: false,
			error: "Invalid or expired NPSSO token"
		})
	}
}
