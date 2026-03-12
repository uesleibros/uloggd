import * as psn from "psn-api"

import { supabase } from "#lib/supabase-ssr.js"

export async function handleConnect(req, res) {
	const { userId, npssoToken } = req.body

	if (!userId || !npssoToken) {
		return res.status(400).json({ error: "userId and npssoToken required" })
	}

	try {
		const accessCode = await exchangeNpssoForAccessCode(npssoToken)
		const authorization = await exchangeAccessCodeForAuthTokens(accessCode)

		const profile = await getProfileFromAccountId(
			{ accessToken: authorization.accessToken },
			"me"
		)

		const expiresAt = new Date(
			Date.now() + authorization.expiresIn * 1000
		).toISOString()

		await supabase
			.from("user_connections")
			.upsert(
				{
					user_id: userId,
					provider: "psn",
					provider_user_id: profile.accountId,
					provider_username: profile.onlineId,
					provider_display_name: profile.onlineId,
					provider_avatar_url:
						profile.avatarUrls?.[0]?.avatarUrl || null,
					access_token: authorization.accessToken,
					refresh_token: authorization.refreshToken || null,
					token_expires_at: expiresAt,
					extra_data: {
						isPlus: profile.isPlus || false,
						aboutMe: profile.aboutMe || null
					},
					connected_at: new Date().toISOString()
				},
				{ onConflict: "user_id, provider" }
			)

		res.json({
			success: true,
			profile: {
				onlineId: profile.onlineId,
				avatar: profile.avatarUrls?.[0]?.avatarUrl || null,
				isPlus: profile.isPlus || false
			}
		})
	} catch (error) {
		console.error("Erro ao conectar PSN:", error)

		res.status(401).json({
			success: false,
			error: "Invalid or expired NPSSO token"
		})
	}
}
