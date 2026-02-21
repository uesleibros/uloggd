import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

const PROFILE_SELECT = `
	username, banner, bio, pronoun, thinking, avatar, avatar_decoration,
	created_at, is_moderator, last_seen, status, username_changed_at,
	user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) )
`

async function getProfileByUserId(userId) {
	const { data } = await supabase
		.from("users")
		.select(PROFILE_SELECT)
		.eq("user_id", userId)
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

function formatProfile(profile) {
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

		res.json(formatProfile(profile))
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: "fail" })
	}
}