export const LIKE_TYPES = {
  review: {
    table: "review_likes",
    targetColumn: "review_id",
    targetTable: "reviews",
    ownerColumn: "user_id",
    notificationType: "review_like",
    getNotificationData: (target, likerId) => ({
      liker_id: likerId,
      review_id: target.id,
      game_slug: target.game_slug
    })
  }
}

export function getLikeConfig(type) {
  return LIKE_TYPES[type] || null
}