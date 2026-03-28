import { supabase } from "#lib/supabase-ssr.js"
import { nxapiWebfinger, verifySignedData } from "#services/nintendo/utils/nxapi.js"
import {
	checkVerificationAttempt,
	incrementVerificationAttempt,
	setConnectionAttempt,
	getAttemptCount,
} from "#services/nintendo/utils/rateLimiter.js"

export async function handleVerify(req, res) {
	const userId = req.user.id
	const { verificationToken } = req.body

	if (!verificationToken) {
		return res.status(400).json({ error: "no_verification_session" })
	}

	const state = verifySignedData(verificationToken)
	if (!state) {
		return res.status(400).json({ error: "expired_or_invalid_session" })
	}

	if (state.userId !== userId) {
		return res.status(403).json({ error: "user_mismatch" })
	}

	const attemptCheck = checkVerificationAttempt(userId)
	if (!attemptCheck.allowed) {
		return res.status(429).json({
			error: attemptCheck.reason,
			retryAfter: attemptCheck.retryAfter || 0,
			attemptsLeft: Math.max(0, 3 - getAttemptCount(userId)),
		})
	}

	incrementVerificationAttempt(userId)

	try {
		const webfinger = await nxapiWebfinger(state.friendCode)

		if (!webfinger || !webfinger.properties) {
			return res.status(502).json({
				error: "lookup_unavailable",
				attemptsLeft: Math.max(0, 3 - getAttemptCount(userId)),
			})
		}

		const currentName = webfinger.properties["https://nxapi-auth.fancy.org.uk/ns/baas/nsa/name"]

		if (!currentName) {
			return res.status(502).json({
				error: "lookup_unavailable",
				attemptsLeft: Math.max(0, 3 - getAttemptCount(userId)),
			})
		}

		if (currentName === state.code) {
			setConnectionAttempt(userId)

			const { error } = await supabase
				.from("user_connections")
				.upsert({
					user_id: userId,
					provider: "nintendo",
					provider_user_id: state.friendCode,
					provider_username: state.friendCode,
					provider_display_name: state.profile.name,
					provider_avatar_url: state.profile.avatar,
					extra_data: {
						nsaId: state.nsaId,
						verifiedAt: new Date().toISOString(),
					},
				}, { onConflict: "user_id,provider" })

			if (error) {
				console.error("nintendo save error:", error)
				return res.status(500).json({ error: "save_failed" })
			}

			return res.json({
				verified: true,
				connection: {
					code: state.friendCode,
					nickname: state.profile.name,
					avatar: state.profile.avatar,
				},
			})
		}

		return res.json({
			verified: false,
			currentName,
			expectedCode: state.code,
			attemptsLeft: Math.max(0, 3 - getAttemptCount(userId)),
		})
	} catch (err) {
		console.error("nintendo verify error:", err)
		return res.status(500).json({
			error: "verify_failed",
			attemptsLeft: Math.max(0, 3 - getAttemptCount(userId)),
		})
	}
}
