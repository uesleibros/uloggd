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
  },
  list: {
    table: "list_likes",
    targetColumn: "list_id",
    targetTable: "lists",
    ownerColumn: "user_id",
    notificationType: "list_like",
    getNotificationData: (target, likerId) => ({
      liker_id: likerId,
      list_id: target.id,
      list_title: target.title
    })
  },
  tierlist: {
    table: "tierlist_likes",
    targetColumn: "tierlist_id",
    targetTable: "tierlists",
    ownerColumn: "user_id",
    notificationType: "tierlist_like",
    getNotificationData: (target, likerId) => ({
      liker_id: likerId,
      tierlist_id: target.id,
      tierlist_title: target.title
    })
  }
}

export function getLikeConfig(type) {
  return LIKE_TYPES[type] || null
}