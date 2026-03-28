const connectionAttempts = new Map()
const verificationAttempts = new Map()

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

export function getAttemptCount(userId) {
	const state = verificationAttempts.get(userId)
	if (!state) return 0
	if (Date.now() - state.startedAt > 10 * 60 * 1000) {
		verificationAttempts.delete(userId)
		return 0
	}
	return state.attempts
}

export function checkVerificationAttempt(userId) {
	const state = verificationAttempts.get(userId)

	if (!state || Date.now() - state.startedAt > 10 * 60 * 1000) {
		verificationAttempts.set(userId, { attempts: 0, lastAttemptAt: 0, startedAt: Date.now() })
		return { allowed: true }
	}

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
	let state = verificationAttempts.get(userId)
	if (!state) {
		state = { attempts: 0, lastAttemptAt: 0, startedAt: Date.now() }
		verificationAttempts.set(userId, state)
	}
	state.attempts++
	state.lastAttemptAt = Date.now()
}
