const connectionAttempts = new Map()
const verificationSessions = new Map()

export function checkConnectionRateLimit(userId) {
	const now = Date.now()
	const last = connectionAttempts.get(userId)

	if (last && now - last < 5 * 60 * 1000) {
		const remaining = Math.ceil((5 * 60 * 1000 - (now - last)) / 1000)
		return { allowed: false, retryAfter: remaining }
	}

	return { allowed: true }
}

export function setConnectionAttempt(userId) {
	connectionAttempts.set(userId, Date.now())
}

export function getVerificationState(userId) {
	const state = verificationSessions.get(userId)
	if (!state) return null

	if (Date.now() - state.createdAt > 10 * 60 * 1000) {
		verificationSessions.delete(userId)
		return null
	}

	return state
}

export function createVerificationState(userId, code, nsaId, friendCode, profile) {
	verificationSessions.set(userId, {
		code,
		nsaId,
		friendCode,
		profile,
		attempts: 0,
		lastAttemptAt: 0,
		createdAt: Date.now(),
	})
}

export function checkVerificationAttempt(userId) {
	const state = verificationSessions.get(userId)
	if (!state) return { allowed: false, reason: "no_session" }

	if (state.attempts >= 3) {
		return { allowed: false, reason: "max_attempts" }
	}

	const now = Date.now()
	if (state.attempts > 0 && now - state.lastAttemptAt < 60 * 1000) {
		const remaining = Math.ceil((60 * 1000 - (now - state.lastAttemptAt)) / 1000)
		return { allowed: false, reason: "cooldown", retryAfter: remaining }
	}

	return { allowed: true }
}

export function incrementVerificationAttempt(userId) {
	const state = verificationSessions.get(userId)
	if (state) {
		state.attempts++
		state.lastAttemptAt = Date.now()
	}
}

export function clearVerificationState(userId) {
	verificationSessions.delete(userId)
}
