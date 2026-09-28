/**
 * Who may reply to something: everyone, the people who follow you, nobody.
 *
 * The same three values as the visibility beside them, asking a different
 * question, and the union was written out in fourteen files under four names
 * — `CommentScope`, `CommunityScope`, `Scope`, and eight anonymous copies
 * inline in a prop. One name, one list.
 */
export type CommentScope = "EVERYONE" | "FOLLOWERS" | "NOBODY";

/** In the order they are offered, from the most open to the least. */
export const COMMENT_SCOPES = ["EVERYONE", "FOLLOWERS", "NOBODY"] as const;

export function isCommentScope(value: unknown): value is CommentScope {
  return value === "EVERYONE" || value === "FOLLOWERS" || value === "NOBODY";
}
