import { supabase } from "#lib/supabase-ssr.js"
import { nxapiPresence } from "#services/nintendo/utils/nxapi.js"
import {
	getVerificationState,
	checkVerificationAttempt,
	incrementVerificationAttempt,
	clearVerificationState,
	setConnectionAttempt,
} from "#services/nintendo/utils/rateLimiter.js"

export async function handleVerify(req, res) {
	const userId = req.user.id

	const state = getVerificationState(userId)
	if (!state) {
		return res.status(400).json({ error: "no_verification_session" })
	}

	const attemptCheck = checkVerificationAttempt(userId)
	if (!attemptCheck.allowed) {
		return res.status(429).json({
			error: attemptCheck.reason,
			retryAfter: attemptCheck.retryAfter || 0,
			attemptsLeft: Math.max(0, 3 - (getVerificationState(userId)?.attempts || 0)),
		})
	}

	incrementVerificationAttempt(userId)

	try {
		const presence = await nxapiPresence(state.nsaId)

		if (!presence || !presence.friend) {
			const currentState = getVerificationState(userId)
			return res.status(400).json({
				error: "presence_unavailable",
				attemptsLeft: Math.max(0, 3 - (currentState?.attempts || 0)),
			})
		}

		const currentName = presence.friend.name

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
					provider_avatar: state.profile.avatar,
					provider_metadata: {
						nsaId: state.nsaId,
						verifiedAt: new Date().toISOString(),
					},
				}, { onConflict: "user_id,provider" })

			if (error) {
				console.error("nintendo save error:", error)
				return res.status(500).json({ error: "save_failed" })
			}

			clearVerificationState(userId)

			return res.json({
				verified: true,
				connection: {
					code: state.friendCode,
					nickname: state.profile.name,
					avatar: state.profile.avatar,
				},
			})
		}

		const currentState = getVerificationState(userId)
		return res.json({
			verified: false,
			currentName,
			expectedCode: state.code,
			attemptsLeft: Math.max(0, 3 - (currentState?.attempts || 0)),
		})
	} catch (err) {
		console.error("nintendo verify error:", err)
		const currentState = getVerificationState(userId)
		return res.status(500).json({
			error: "verify_failed",
			attemptsLeft: Math.max(0, 3 - (currentState?.attempts || 0)),
		})
	}
}
