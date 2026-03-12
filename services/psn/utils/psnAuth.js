import { supabase } from "#lib/supabase-ssr.js"

const AUTH_BASE_URL = "https://ca.account.sony.com/api/authz/v3/oauth"
const AUTH_HEADER = "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A="

export async function refreshPsnToken(userId) {
	const { data: connection, error } = await supabase
		.from("user_connections")
		.select("refresh_token")
		.eq("user_id", userId)
		.eq("provider", "psn")
		.maybeSingle()

	if (error || !connection || !connection.refresh_token) {
		throw new Error("No refresh token available")
	}

	const response = await fetch(`${AUTH_BASE_URL}/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: AUTH_HEADER
		},
		body: new URLSearchParams({
			refresh_token: connection.refresh_token,
			grant_type: "refresh_token",
			token_format: "jwt",
			scope: "psn:mobile.v2.core psn:clientapp"
		}).toString()
	})

	const data = await response.json()

	if (!response.ok) {
		throw new Error("Failed to refresh token")
	}

	const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

	await supabase
		.from("user_connections")
		.update({
			access_token: data.access_token,
			refresh_token: data.refresh_token || connection.refresh_token,
			token_expires_at: expiresAt
		})
		.eq("user_id", userId)
		.eq("provider", "psn")

	return {
		accessToken: data.access_token,
		expiresAt: expiresAt
	}
}

export async function getPsnToken(userId) {
	const { data: connection, error } = await supabase
		.from("user_connections")
		.select("access_token, token_expires_at")
		.eq("user_id", userId)
		.eq("provider", "psn")
		.maybeSingle()

	if (error || !connection) {
		throw new Error("PSN not connected")
	}

	const expiresAt = new Date(connection.token_expires_at)
	const now = new Date()
	const expiresIn = (expiresAt - now) / 1000 / 60

	if (expiresIn < 30) {
		const refreshed = await refreshPsnToken(userId)
		return refreshed.accessToken
	}

	return connection.access_token
}
