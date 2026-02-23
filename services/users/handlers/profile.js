import { supabase } from "#lib/supabase-ssr.js"
import twitchClient from "#lib/twitch.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"
import { decode } from "#utils/shortId.js"

const PROFILE_SELECT = `
	username, banner, bio, pronoun, thinking, avatar, avatar_decoration,
	created_at, is_moderator, last_seen, status, username_changed_at,
	user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) ),
	user_connections ( provider, provider_username )
`

async function getProfileByUserId(userId) {
	const { data } = await supabase
		.from("users")
		.select(`user_id, ${PROFILE_SELECT}`)
		.eq("user_id", decode(userId))
		.single()

	return data
}

async function getProfileByUsername(username) {
	const { data } = await supabase
		.from("users")
		.select(`user_id, ${PROFILE_SELECT}`)
		.ilike("username", username)
		.single()

	return data
}

function formatProfile(profile, stream = null) {
	if (!profile) return null

	const badges = profile.user_badges?.map(ub => ({
		...ub.badge,
		assigned_at: ub.assigned_at,
	})) || []

	return {
		id: profile.user_id,
		username: profile.username,
		avatar: profile.avatar || DEFAULT_AVATAR_URL,
		banner: profile.banner,
		bio: profile.bio,
		avatar_decoration: profile.avatar_decoration,
		thinking: profile.thinking,
		pronoun: profile.pronoun,
		is_moderator: profile.is_moderator,
		created_at: profile.created_at,
		last_seen: profile.last_seen,
		status: profile.status,
		username_changed_at: profile.username_changed_at,
		badges,
		stream,
	}
}

export async function handleProfile(req, res) {
	const { userId, username } = req.body
	if (!userId && !username) return res.status(400).json({ error: "missing userId or username" })

	try {
		const profile = userId
			? await getProfileByUserId(userId)
			: await getProfileByUsername(username)

		if (!profile) return res.status(404).json({ error: "user not found" })

		let stream = null
		const twitchConnection = profile.user_connections?.find(c => c.provider === "twitch")

		if (twitchConnection?.provider_username) {
			try {
				const streamData = await twitchClient.getStream(twitchConnection.provider_username)
				if (streamData) {
					stream = {
						twitch_username: twitchConnection.provider_username,
						title: streamData.title,
						game: streamData.game_name,
						viewers: streamData.viewer_count,
						thumbnail: streamData.thumbnail_url.replace("{width}", "320").replace("{height}", "180")
					}
				}
			} catch {}
		}

		res.json(formatProfile(profile, stream))
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}
