import { supabase } from "#lib/supabase-ssr.js"
import { nxapiPresence } from "#services/nintendo/utils/nxapi.js"

const presenceCache = new Map()
const CACHE_TTL = 30 * 1000

function getCachedPresence(nsaId) {
	const cached = presenceCache.get(nsaId)
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data
	}
	return null
}

function setCachedPresence(nsaId, data) {
	presenceCache.set(nsaId, {
		data,
		timestamp: Date.now(),
	})
	
	if (presenceCache.size > 1000) {
		const now = Date.now()
		for (const [key, value] of presenceCache) {
			if (now - value.timestamp > CACHE_TTL) {
				presenceCache.delete(key)
			}
		}
	}
}

function formatPlayTime(seconds) {
	if (!seconds) return null
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	if (hours > 0) return `${hours}h ${minutes}m`
	return `${minutes}m`
}

function normalizePresence(data) {
	const friend = data.friend
	const presence = friend.presence
	const title = data.title
	const presenceGame = presence.game

	const state = presence.state?.toLowerCase() || "offline"
	const isOnline = state === "online" || state === "playing"
	const isPlaying = state === "playing" || !!presenceGame

	const result = {
		state: isPlaying ? "playing" : isOnline ? "online" : "offline",
		isOnline,
		isPlaying,
		updatedAt: presence.updatedAt ? new Date(presence.updatedAt * 1000).toISOString() : new Date().toISOString(),
		lastOnlineAt: presence.logoutAt ? new Date(presence.logoutAt * 1000).toISOString() : null,
		user: {
			name: friend.name,
			imageUri: friend.imageUri,
			image2Uri: friend.image2Uri,
		},
	}

	if (presenceGame) {
		result.game = {
			name: presenceGame.name || title?.name || null,
			imageUrl: presenceGame.imageUri || title?.image_url || null,
			shopUrl: presenceGame.shopUri || title?.url || null,
			totalPlayTime: formatPlayTime(presenceGame.totalPlayTime),
			sessionTime: title?.since ? formatPlayTime(Math.floor((Date.now() - new Date(title.since).getTime()) / 1000)) : null,
			firstPlayedAt: presenceGame.firstPlayedAt ? new Date(presenceGame.firstPlayedAt * 1000).toISOString() : null,
		}
	} else if (title && Object.keys(title).length > 0) {
		result.game = {
			name: title.name || null,
			imageUrl: title.image_url || null,
			shopUrl: title.url || null,
			totalPlayTime: null,
			firstPlayedAt: null,
		}
	}

	return result
}

function syncConnectionInBackground(connection, friend) {
	const extraData = connection.extra_data || {}
	const updates = {}

	if (connection.provider_display_name !== friend.name) {
		updates.provider_display_name = friend.name
	}

	if (connection.provider_avatar_url !== friend.imageUri) {
		updates.provider_avatar_url = friend.imageUri
	}

	if (extraData.image2Uri !== friend.image2Uri || extraData.friendId !== friend.id) {
		updates.extra_data = {
			...extraData,
			friendId: friend.id,
			image2Uri: friend.image2Uri,
		}
	}

	if (Object.keys(updates).length > 0) {
		supabase
			.from("user_connections")
			.update(updates)
			.eq("id", connection.id)
			.then(() => {})
			.catch(err => console.error("sync connection error:", err))
	}
}

export async function handlePresence(req, res) {
	const targetUserId = req.query.userId
	const skipCache = req.query.refresh === "true"

	if (!targetUserId) {
		return res.status(400).json({ error: "user_id_required" })
	}

	const { data: connection, error } = await supabase
		.from("user_connections")
		.select("id, provider_user_id, provider_display_name, provider_avatar_url, extra_data")
		.eq("user_id", targetUserId)
		.eq("provider", "nintendo")
		.single()

	if (error || !connection) {
		return res.json({ connected: false, presence: null })
	}

	const extraData = connection.extra_data || {}
	const nsaId = extraData.nsaId

	if (!nsaId) {
		return res.json({
			connected: true,
			presence: null,
			error: "no_nsa_id",
		})
	}

	if (!skipCache) {
		const cached = getCachedPresence(nsaId)
		if (cached) {
			return res.json({
				connected: true,
				presence: cached,
				cached: true,
			})
		}
	}

	try {
		const presenceData = await nxapiPresence(nsaId)
		
		if (!presenceData || !presenceData.friend) {
			return res.json({
				connected: true,
				presence: { state: "offline", updatedAt: new Date().toISOString() },
				cached: false,
			})
		}

		const presence = normalizePresence(presenceData)
		setCachedPresence(nsaId, presence)

		syncConnectionInBackground(connection, presenceData.friend)

		res.json({
			connected: true,
			presence,
			cached: false,
		})
	} catch (err) {
		console.error("nintendo presence error:", err)
		
		const staleCache = presenceCache.get(nsaId)
		if (staleCache) {
			return res.json({
				connected: true,
				presence: staleCache.data,
				cached: true,
				stale: true,
			})
		}

		return res.json({
			connected: true,
			presence: null,
			error: "presence_fetch_failed",
		})
	}
}