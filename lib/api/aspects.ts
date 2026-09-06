import "server-only";
import { ApiFailure } from "./route";

/**
 * The scored parts of a review: story, combat, whatever the author named.
 *
 * Validated here and handed to the database as one jsonb value, because that
 * is how create_review takes them: the rows are written inside the same
 * transaction as the review, so a review can never exist with half its
 * aspects attached.
 */
export function aspects(body: Record<string, unknown>) {
  const value = body.aspects;
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12)
    throw new ApiFailure(
      "invalid_request",
      "aspects must be a list of at most 12 scored parts.",
    );

  return value.map((one) => {
    const row = one as Record<string, unknown>;
    const label = typeof row?.label === "string" ? row.label.trim() : "";
    const rating = row?.rating;
    if (!label || label.length > 40)
      throw new ApiFailure(
        "invalid_request",
        "every aspect needs a label of 1 to 40 characters.",
      );
    if (typeof rating !== "number" || !Number.isInteger(rating))
      throw new ApiFailure(
        "invalid_request",
        "every aspect needs a whole rating.",
      );
    const note = typeof row?.note === "string" ? row.note.slice(0, 500) : null;
    return { label, rating, note, custom: row?.custom === true };
  });
}
