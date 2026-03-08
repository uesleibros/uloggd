import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

function formatBadges(userBadges) {
  return (userBadges || [])
    .filter(ub => ub.badge)
    .map(ub => ({ ...ub.badge, assigned_at: ub.assigned_at }))
}

function formatMinerals(userMinerals) {
  if (!userMinerals) {
    return {
      copper: 0,
      iron: 0,
      gold: 0,
      emerald: 0,
      diamond: 0,
      ruby: 0
    }
  }

  return {
    copper: userMinerals.copper || 0,
    iron: userMinerals.iron || 0,
    gold: userMinerals.gold || 0,
    emerald: userMinerals.emerald || 0,
    diamond: userMinerals.diamond || 0,
    ruby: userMinerals.ruby || 0
  }
}

export function formatFullProfile(
  profile,
  { stream = null, counts = {}, ban = null } = {}
) {
  if (!profile) return null

  const equipped = profile.equipped

  return {
    id: profile.user_id,
    username: profile.username,
    avatar: profile.avatar || DEFAULT_AVATAR_URL,
    banner: profile.banner,
    bio: profile.bio,
    thinking: profile.thinking,
    pronoun: profile.pronoun,
    is_moderator: profile.is_moderator,
    is_banned: profile.is_banned,
    ban_reason: ban?.reason || null,
    expires_at: ban?.expires_at || null,
    created_at: profile.created_at,
    last_seen: profile.last_seen,
    status: profile.status,
    username_changed_at: profile.username_changed_at,
    connections: profile.user_connections || [],
    badges: formatBadges(profile.user_badges),
    minerals: formatMinerals(profile.user_minerals),
    equipped,
    stream,
    counts: {
      reviews: counts.reviews || 0,
      likedReviews: counts.likedReviews || 0,
    },
  }
}

export function formatListProfile(profile, { stream = null } = {}) {
  if (!profile) return null

  const equipped = profile.equipped

  return {
    id: profile.user_id,
    username: profile.username,
    avatar: profile.avatar || DEFAULT_AVATAR_URL,
    is_moderator: profile.is_moderator,
    last_seen: profile.last_seen,
    status: profile.status,
    badges: formatBadges(profile.user_badges),
    equipped,
    stream,
  }
}

export function formatSearchProfile(profile, { stream = null } = {}) {
  if (!profile) return null

  return {
    ...formatListProfile(profile, { stream }),
    bio: profile.bio,
    created_at: profile.created_at,
  }
}

export function formatUserMap(users, streamsMap = {}) {
  const map = {}

  for (const u of users) {
    const equipped = u.equipped
    
    map[u.user_id] = {
      username: u.username,
      avatar: u.avatar || DEFAULT_AVATAR_URL,
      last_seen: u.last_seen,
      status: u.status,
      badges: formatBadges(u.user_badges),
      equipped,
      stream: streamsMap[u.user_id] || null,
    }
  }

  return map
}

export function formatMinimalUserMap(users) {
  const map = {}

  for (const u of users) {
    const equipped = u.equipped
    
    map[u.user_id] = {
      username: u.username,
      avatar: u.avatar || DEFAULT_AVATAR_URL,
      equipped,
    }
  }

  return map
}
