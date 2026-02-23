import { supabase } from "#lib/supabase-ssr.js"
import { getRedirectUri, decodeState, exchangeCode, fetchTwitchUser } from "../utils.js"

export async function handleCallback(req, res) {
	const { code, state, error: oauthError } = req.query

	if (oauthError || !code || !state) {
		return res.redirect("/?error=twitch_auth_failed")
	}

	const stateData = decodeState(state)
	if (!stateData) {
		return res.redirect("/?error=invalid_state")
	}

	const { userId, returnUrl } = stateData

	if (!userId) {
		return res.redirect("/?error=missing_user")
	}

	try {
		const redirectUri = getRedirectUri()
		const tokens = await exchangeCode(code, redirectUri)
		const twitchUser = await fetchTwitchUser(tokens.access_token)

		if (!twitchUser) {
			throw new Error("No user found")
		}

		const { error } = await supabase
			.from("user_connections")
			.upsert({
				user_id: userId,
				provider: "twitch",
				provider_user_id: twitchUser.id,
				provider_username: twitchUser.login,
				provider_display_name: twitchUser.display_name,
				provider_avatar_url: twitchUser.profile_image_url,
				connected_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}, {
				onConflict: "user_id,provider"
			})

		if (error) throw error

		res.redirect(`${returnUrl}?twitch=connected`)
	} catch (err) {
		console.error("Twitch OAuth error:", err)
		res.redirect(`${returnUrl || "/"}?error=twitch_auth_failed`)
	}
}
