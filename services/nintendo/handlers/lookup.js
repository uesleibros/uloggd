import { supabase } from "#lib/supabase-ssr.js"
import {
	nxapiWebfinger,
	generateVerificationCode,
	normalizeSwitchCode,
	signVerificationData,
} from "#services/nintendo/utils/nxapi.js"
import { checkConnectionRateLimit } from "#services/nintendo/utils/rateLimiter.js"

export async function handleLookup(req, res) {
	const { code } = req.body
	const userId = req.user.id

	const formatted = normalizeSwitchCode(code)
	if (!formatted) return res.status(400).json({ error: "invalid_code" })

	const rateCheck = checkConnectionRateLimit(userId)
	if (!rateCheck.allowed) {
		return res.status(429).json({ error: "rate_limit", retryAfter: rateCheck.retryAfter })
	}

	const { data: existing } = await supabase
		.from("user_connections")
		.select("user_id")
		.eq("provider", "nintendo")
		.eq("provider_user_id", formatted)
		.single()

	if (existing) {
		return res.status(409).json({ error: "code_already_linked" })
	}

	try {
		const webfinger = await nxapiWebfinger(formatted)

		if (!webfinger || !webfinger.properties) {
			return res.status(404).json({ error: "not_found" })
		}

		const props = webfinger.properties
		const nsaId = props["https://nxapi-auth.fancy.org.uk/ns/baas/nsa/id"]
		const name = props["https://nxapi-auth.fancy.org.uk/ns/baas/nsa/name"]

		let avatar = null
		if (webfinger.links) {
			const avatarLink = webfinger.links.find(l => l.rel === "http://webfinger.net/rel/avatar")
			if (avatarLink) avatar = avatarLink.href
		}

		if (!nsaId) return res.status(404).json({ error: "not_found" })

		const verificationCode = generateVerificationCode()

		const verificationToken = signVerificationData({
			code: verificationCode,
			nsaId,
			friendCode: formatted,
			userId,
			profile: { name, avatar, friendCode: formatted },
			createdAt: Date.now(),
		})

		res.json({
			found: true,
			profile: { name, avatar, friendCode: formatted },
			verificationCode,
			verificationToken,
		})
	} catch (err) {
		console.error("nintendo lookup error:", err)
		return res.status(500).json({ error: "lookup_failed" })
	}
}
