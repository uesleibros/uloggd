/**
 * Resolves a URL segment to the column it should be looked up by.
 *
 * Every shareable row carries both a UUID and a short public id, and both are
 * accepted in a URL: the short one is what gets shared, the UUID is what older
 * links and internal references carry. Returning the column name rather than
 * branching at each call site keeps the two shapes in one place.
 *
 * The public id alphabet excludes the characters that are easy to confuse when
 * a link is read aloud or retyped: 0/O, 1/l/I.
 *
 * Anything else returns null, so an unparseable segment becomes "not found"
 * rather than a query with a value the database will reject.
 */
const PUBLIC_ID = /^[23456789A-HJ-NP-Za-km-z]{10}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export function contentKey(id: string) {
  if (PUBLIC_ID.test(id)) return ["public_id", id] as const;
  if (UUID.test(id)) return ["id", id] as const;
  return null;
}
