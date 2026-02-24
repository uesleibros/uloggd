import SteamAuth from "node-steam-openid"
import { supabase } from "#lib/supabase-ssr.js"

export async function handleCallback(req, res) {
	const { userId } = req.query
	const baseUrl = process.env.APP_URL

	const steam = new SteamAuth({
		realm: baseUrl,
		returnUrl: `${baseUrl}/api/steam/callback?userId=${userId}`,
		apiKey: process.env.STEAM_WEB_API_KEY
	})

	try {
		const user = await steam.authenticate(req)

		await supabase
			.from("user_connections")
			.upsert({
				user_id: userId,
				provider: "steam",
				provider_username: user.steamid,
				provider_display_name: user.username,
				provider_avatar_url: user.avatar.large,
				connected_at: new Date().toISOString()
			}, { onConflict: 'user_id, provider' })

		res.redirect('/') 
	} catch (error) {
		console.error("Erro no callback da Steam:", error)
		res.redirect('/?error=steam_failed')
	}

}
