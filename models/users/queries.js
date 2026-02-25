import { supabase } from "#lib/supabase-ssr.js"

const BADGES_REL = `user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) )`
const CONNECTIONS_FULL = `user_connections ( provider, provider_user_id, provider_username, provider_display_name )`
const CONNECTIONS_TWITCH = `user_connections ( provider, provider_username )`

const FULL_FIELDS = `
	user_id, username, banner, bio, pronoun, thinking, avatar, avatar_decoration,
	created_at, is_moderator, is_banned, last_seen, status, username_changed_at
`

const LIST_FIELDS = `user_id, username, avatar, is_moderator, avatar_decoration, last_seen, status`

const MINIMAL_FIELDS = `user_id, username, avatar, avatar_decoration`

export async function findManyByIdsMinimal(userIds) {
	if (!userIds.length) return []

	const { data } = await supabase
		.from("users")
		.select(MINIMAL_FIELDS)
		.in("user_id", userIds)

	return data || []
}

export async function findByUserId(userId) {
	const { data } = await supabase
		.from("users")
		.select(`${FULL_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_FULL}`)
		.eq("user_id", userId)
		.single()
	return data
}

export async function findByUsername(username) {
	const { data } = await supabase
		.from("users")
		.select(`${FULL_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_FULL}`)
		.ilike("username", username)
		.single()
	return data
}

export async function findManyByIds(userIds) {
	if (!userIds.length) return []

	const { data } = await supabase
		.from("users")
		.select(`${LIST_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_TWITCH}`)
		.in("user_id", userIds)

	return data || []
}

export async function searchByUsername(query, { limit = 20, offset = 0, sort = "relevance" } = {}) {
	let q = supabase
		.from("users")
		.select(`${FULL_FIELDS}, bio, ${BADGES_REL}, ${CONNECTIONS_TWITCH}`, { count: "exact" })
		.ilike("username", `%${query}%`)

	if (sort === "newest") q = q.order("created_at", { ascending: false })
	else q = q.order("username", { ascending: true })

	const { data, count, error } = await q.range(offset, offset + limit - 1)
	if (error) throw error

	return { data: data || [], total: count || 0 }
}

export async function getProfileCounts(userId) {
	const [reviewsRes, likedRes] = await Promise.all([
		supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
		supabase.from("review_likes").select("*", { count: "exact", head: true }).eq("user_id", userId),
	])

	return {
		reviews: reviewsRes.count || 0,
		likedReviews: likedRes.count || 0,
	}
}

export async function getFollowIds(userId, type, { limit = 20, offset = 0 } = {}) {
	const isFollowers = type === "followers"
	const column = isFollowers ? "follower_id" : "following_id"
	const filterColumn = isFollowers ? "following_id" : "follower_id"

	const { data, count } = await supabase
		.from("follows")
		.select(column, { count: "exact" })
		.eq(filterColumn, userId)
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1)

	return {
		ids: data?.map(r => r[column]) || [],
		total: count || 0,
	}
}

export async function getFollowStatus(userId, currentUserId) {
	const [followersRes, followingRes, isFollowingRes, followsYouRes] = await Promise.all([
		supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
		supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
		currentUserId
			? supabase.from("follows").select("id").eq("follower_id", currentUserId).eq("following_id", userId).maybeSingle()
			: Promise.resolve({ data: null }),
		currentUserId
			? supabase.from("follows").select("id").eq("follower_id", userId).eq("following_id", currentUserId).maybeSingle()
			: Promise.resolve({ data: null }),
	])

	return {
		followers: followersRes.count || 0,
		following: followingRes.count || 0,
		isFollowing: !!isFollowingRes.data,
		followsYou: !!followsYouRes.data,
	}
}