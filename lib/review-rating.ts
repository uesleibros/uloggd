import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A score, written in the scale its author chose.
 *
 * Ratings are stored 0-100 whatever scale was used to give them, so every
 * screen that shows one has to divide it back down. Six files did that
 * arithmetic, four of them with the same four lines copied word for word, and
 * the two that were not copies disagreed: the editor's own preview wrote
 * `4,5 / 5` with spaces while the review it was writing said `4,5/5`, and the
 * share card wrote `4.5/5` with an English decimal point in every language.
 *
 * The scale is the author's choice and the separator is the reader's locale,
 * which is why both are arguments here and neither is a screen's business.
 */
export const RATING_MODES = [
  "stars_5",
  "level_5",
  "score_10",
  "score_100",
  "recommend",
] as const;

export type RatingMode = (typeof RATING_MODES)[number];

export function formatRating(
  rating: number,
  mode: RatingMode | string | null | undefined,
  lang: UiLang,
) {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  // Levels are whole by definition: half a level is not a thing somebody can
  // pick, so a stored 45 is the fourth level and not four and a half.
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}

/**
 * What a review's verdict reads as, whichever way it was given.
 *
 * `recommend` has no number at all: the author said yes or no, and a review
 * still being written has said neither. Null means there is nothing to show,
 * which is not the same as a zero.
 */
export function formatVerdict(
  rating: number | null,
  mode: RatingMode | string | null | undefined,
  recommended: boolean | null,
  lang: UiLang,
) {
  if (mode === "recommend") {
    if (recommended === null) return null;
    return recommended
      ? tri(lang, "Recomenda", "Recommends", "Recomienda")
      : tri(lang, "Não recomenda", "Doesn't recommend", "No recomienda");
  }
  if (rating === null) return null;
  return formatRating(rating, mode, lang);
}

/**
 * The same score as a number rather than a sentence, for structured data.
 *
 * Search engines want a figure and a scale, not a locale's comma, so this is
 * the one reader that does not go through `formatRating`.
 */
export function ratingOutOfFive(rating: number) {
  return Number((rating / 20).toFixed(1));
}
