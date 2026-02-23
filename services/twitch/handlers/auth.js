import { getRedirectUri, encodeState, buildAuthUrl } from "../utils.js"

export async function handleAuth(req, res) {
	const { userId, returnUrl } = req.query

	if (!userId) {
		return res.redirect("/?error=missing_user")
	}

	const state = encodeState({ userId, returnUrl: returnUrl || "/" })
	const authUrl = buildAuthUrl(process.env.TWITCH_CLIENT_ID, getRedirectUri(req), state)

	res.redirect(authUrl)
}
