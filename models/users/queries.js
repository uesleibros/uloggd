import { supabase } from "#lib/supabase-ssr.js"

const BADGES_REL = `user_badges ( assigned_at, badge:badges ( id, icon_url, color ) )`
const MINERALS_REL = `user_minerals ( copper, iron, gold, emerald, diamond, ruby )`
const CONNECTIONS_FULL = `user_connections ( provider, provider_user_id, provider_username, provider_display_name )`
const CONNECTIONS_TWITCH = `user_connections ( provider, provider_username )`

const EQUIPPED_REL = `
  user_equipped_items (
    slot,
    inventory:user_inventory (
      item:store_items (
        id,
        slug,
        name,
        asset_url,
        item_type
      )
    )
  )
`

const FULL_FIELDS = `
  user_id, username, banner, bio, pronoun, thinking, avatar,
  created_at, is_moderator, is_banned, last_seen, status, username_changed_at
`

const LIST_FIELDS = `user_id, username, avatar, is_moderator, last_seen, status`

const MINIMAL_FIELDS = `user_id, username, avatar`

const MINERALS_FIELDS = `user_id, copper, iron, gold, emerald, diamond, ruby`

function formatEquipped(user) {
  if (!user) return user
  
  const equipped = {}
  
  if (user.user_equipped_items) {
    for (const eq of user.user_equipped_items) {
      if (eq.inventory?.item) {
        equipped[eq.slot] = eq.inventory.item
      }
    }
    delete user.user_equipped_items
  }
  
  user.equipped = equipped
  return user
}

function formatUsers(users) {
  return users.map(formatEquipped)
}

export async function getMinerals(userId) {
  const { data } = await supabase
    .from("user_minerals")
    .select(MINERALS_FIELDS)
    .eq("user_id", userId)
    .single()

  return data
}

export async function getMineralsRanking({ limit = 20, offset = 0, sortBy = "ruby" } = {}) {
  const validSorts = ["copper", "iron", "gold", "emerald", "diamond", "ruby"]
  const sort = validSorts.includes(sortBy) ? sortBy : "ruby"

  const { data, count } = await supabase
    .from("user_minerals")
    .select(`${MINERALS_FIELDS}, users!inner(username, avatar, ${EQUIPPED_REL})`, { count: "exact" })
    .order(sort, { ascending: false })
    .range(offset, offset + limit - 1)

  const formatted = data?.map(d => ({
    ...d,
    users: formatEquipped(d.users)
  })) || []

  return {
    data: formatted,
    total: count || 0
  }
}

export async function findManyByIdsMinimal(userIds) {
  if (!userIds.length) return []

  const { data } = await supabase
    .from("users")
    .select(`${MINIMAL_FIELDS}, ${EQUIPPED_REL}`)
    .in("user_id", userIds)

  return formatUsers(data || [])
}

export async function findByUserId(userId) {
  const { data } = await supabase
    .from("users")
    .select(`${FULL_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_FULL}, ${MINERALS_REL}, ${EQUIPPED_REL}`)
    .eq("user_id", userId)
    .single()
    
  return formatEquipped(data)
}

export async function findByUsername(username) {
  const { data } = await supabase
    .from("users")
    .select(`${FULL_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_FULL}, ${MINERALS_REL}, ${EQUIPPED_REL}`)
    .ilike("username", username)
    .single()
    
  return formatEquipped(data)
}

export async function findManyByIds(userIds) {
  if (!userIds.length) return []

  const { data } = await supabase
    .from("users")
    .select(`${LIST_FIELDS}, ${BADGES_REL}, ${CONNECTIONS_TWITCH}, ${EQUIPPED_REL}`)
    .in("user_id", userIds)

  return formatUsers(data || [])
}

export async function searchByUsername(query, { limit = 20, offset = 0, sort = "relevance" } = {}) {
  let q = supabase
    .from("users")
    .select(`${FULL_FIELDS}, bio, ${BADGES_REL}, ${CONNECTIONS_TWITCH}, ${EQUIPPED_REL}`, { count: "exact" })
    .ilike("username", `%${query}%`)

  if (sort === "newest") q = q.order("created_at", { ascending: false })
  else q = q.order("username", { ascending: true })

  const { data, count, error } = await q.range(offset, offset + limit - 1)
  if (error) throw error

  return { data: formatUsers(data || []), total: count || 0 }
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



