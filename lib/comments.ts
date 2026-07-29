export const COMMENT_MAX_CHARACTERS = 500;

/** PostgreSQL char_length counts Unicode code points, not UTF-16 units. */
export function commentCharacterCount(value: string) {
  return Array.from(value).length;
}

export function normalizeCommentBody(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/^[ \t\n]+|[ \t\n]+$/g, "");
}

export function limitCommentInput(
  value: string,
  maximum = COMMENT_MAX_CHARACTERS,
) {
  const characters = Array.from(value.replace(/\r\n?/g, "\n"));
  return characters.length > maximum
    ? characters.slice(0, maximum).join("")
    : characters.join("");
}

export function containsDisallowedCommentControls(value: string) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value);
}

export function isValidCommentBody(value: string) {
  const normalized = normalizeCommentBody(value);
  const length = commentCharacterCount(normalized);
  return (
    length >= 1 &&
    length <= COMMENT_MAX_CHARACTERS &&
    !containsDisallowedCommentControls(normalized)
  );
}
