import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Who can see a thing somebody made.
 *
 * One question, asked of a review, a session, a screenshot, a list and a
 * whole library, and answered by the same three values in the database every
 * time. The union was nonetheless written out in seven files, and the three
 * words that name it were written out in three, which is how the site ended
 * up calling the same setting `Público` in a review, `Pública` in a capture
 * and `Públicas` in the list filter, with a globe in one place and an eye in
 * another.
 *
 * The masculine form is the one used here: the label names the state the
 * thing is in, not the thing, so it does not have to agree with a noun the
 * control cannot see.
 */
export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

/** In the order they are offered, from the most open to the least. */
export const VISIBILITIES = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;

export function isVisibility(value: unknown): value is Visibility {
  return value === "PUBLIC" || value === "FOLLOWERS" || value === "PRIVATE";
}

export function visibilityLabel(value: Visibility, lang: UiLang) {
  if (value === "FOLLOWERS") return uiText(lang).followers;
  if (value === "PRIVATE") return tri(lang, "Privado", "Private", "Privado");
  return tri(lang, "Público", "Public", "Público");
}
