export const COMMENT_TYPES = {
  profile: {
    targetTable: "users",
    targetColumn: "user_id",
    ownerColumn: "user_id",
    notificationType: "profile_comment",
    getNotificationData: (targetId, commenterId, commentId) => ({
      commenter_id: commenterId,
      profile_user_id: targetId,
      comment_id: commentId
    })
  },
  review: {
    targetTable: "reviews",
    targetColumn: "id",
    ownerColumn: "user_id",
    notificationType: "review_comment",
    getNotificationData: (targetId, commenterId, commentId) => ({
      commenter_id: commenterId,
      review_id: targetId,
      comment_id: commentId
    })
  },
  list: {
    targetTable: "lists",
    targetColumn: "id",
    ownerColumn: "user_id",
    notificationType: "list_comment",
    getNotificationData: (targetId, commenterId, commentId) => ({
      commenter_id: commenterId,
      list_id: targetId,
      comment_id: commentId
    })
  },
  tierlist: {
    targetTable: "tierlists",
    targetColumn: "id",
    ownerColumn: "user_id",
    notificationType: "tierlist_comment",
    getNotificationData: (targetId, commenterId, commentId) => ({
      commenter_id: commenterId,
      tierlist_id: targetId,
      comment_id: commentId
    })
  },
  screenshot: {
    targetTable: "screenshots",
    targetColumn: "id",
    ownerColumn: "user_id",
    notificationType: "screenshot_comment",
    getNotificationData: (targetId, commenterId, commentId) => ({
      commenter_id: commenterId,
      screenshot_id: targetId,
      comment_id: commentId
    })
  },
}

export function getCommentConfig(type) {
  return COMMENT_TYPES[type] || null
}