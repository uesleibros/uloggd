import SteamAuth from "node-steam-openid"

export async function handleLogin(req, res) {
	const { userId } = req.body
	const baseUrl = process.env.VERCEL_URL 
		? `https://${process.env.VERCEL_URL}` 
		: "http://localhost:3000";

	const steam = new SteamAuth({
		realm: baseUrl,
		returnUrl: `${baseUrl}/api/steam/callback?userId=${userId}`,
		apiKey: process.env.STEAM_WEB_API_KEY
	})

	try {
		const redirectUrl = await steam.getRedirectUrl()
		res.json({ url: redirectUrl })
	} catch (err) {
		console.error("Erro ao gerar URL da Steam:", err)
		res.status(500).json({ error: "Falha ao conectar com a Steam" })
	}
}