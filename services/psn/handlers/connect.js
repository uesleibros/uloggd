import { supabase } from "#lib/supabase-ssr.js"

const AUTH_BASE_URL = "https://ca.account.sony.com/api/authz/v3/oauth"

async function exchangeNpssoForAccessCode(npssoToken) {
	const queryString = new URLSearchParams({
		access_type: "offline",
		client_id: "09515159-7237-4370-9b40-3806e67c0891",
		redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
		response_type: "code",
		scope: "psn:mobile.v2.core psn:clientapp"
	}).toString()

	const requestUrl = `${AUTH_BASE_URL}/authorize?${queryString}`

	const response = await fetch(requestUrl, {
		headers: {
			Cookie: `npsso=${npssoToken}`
		},
		redirect: "manual"
	})

	const location = response.headers.get("location")

	if (!location || !location.includes("?code=")) {
		throw new Error("There was a problem retrieving your PSN access code. Is your NPSSO code valid?")
	}

	const redirectParams = new URLSearchParams(location.split("redirect/")[1])
	return redirectParams.get("code")
}

async function exchangeAccessCodeForAuthTokens(accessCode) {
	const requestUrl = `${AUTH_BASE_URL}/token`

	const response = await fetch(requestUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A="
		},
		body: new URLSearchParams({
			code: accessCode,
			redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
			grant_type: "authorization_code",
			token_format: "jwt"
		}).toString()
	})

	const raw = await response.json()

	return {
		accessToken: raw.access_token,
		expiresIn: raw.expires_in,
		idToken: raw.id_token,
		refreshToken: raw.refresh_token,
		refreshTokenExpiresIn: raw.refresh_token_expires_in,
		scope: raw.scope,
		tokenType: raw.token_type
	}
}

async function getProfile(accessToken) {
	const response = await fetch("https://us-prof.np.community.playstation.net/userProfile/v1/users/me/profile2?fields=onlineId,accountId,avatarUrls,plus,aboutMe", {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	})

	const data = await response.json()

	if (!response.ok) {
		throw new Error("Failed to get profile")
	}

	const profile = data.profile

	return {
		accountId: profile.accountId,
		onlineId: profile.onlineId,
		avatarUrl: profile.avatarUrls?.[0]?.avatarUrl || null,
		isPlus: profile.plus === 1,
		aboutMe: profile.aboutMe || null
	}
}

export async function handleConnect(req, res) {
	const { userId, npssoToken } = req.body

	if (!userId || !npssoToken) {
		return res.status(400).json({ error: "userId and npssoToken required" })
	}

	try {
		const accessCode = await exchangeNpssoForAccessCode(npssoToken)
		const authorization = await exchangeAccessCodeForAuthTokens(accessCode)
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
