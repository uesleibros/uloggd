import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How a list item looks, and deliberately nothing about what it means.
 *
 * A list here can be games somebody wants to buy, games they recommend, the
 * best of a series, a challenge, a ranking, a themed shelf. The site offers a
 * visual language; the author says what it means, in the list's description.
 *
 * So there is no `GOOD`, no `PLAYED`, no `DROPPED` in this file, and red is
 * not worse than green. Whoever made the list decides, and can decide the
 * opposite of whatever anybody would assume.
 */

export type MarkMode = "COLOR" | "DIM";
export type MarkColor =
  | "RED"
  | "ORANGE"
  | "YELLOW"
  | "GREEN"
  | "CYAN"
  | "BLUE"
  | "PURPLE"
  | "PINK"
  | "NEUTRAL";

export type ItemMark = {
  mark_mode: MarkMode | null;
  mark_color: MarkColor | null;
};

export const MARK_COLORS: MarkColor[] = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "CYAN",
  "BLUE",
  "PURPLE",
  "PINK",
  "NEUTRAL",
];

/**
 * The name of a colour, for the people who cannot see it.
 *
 * A name, never a meaning: "red", not "bad". Inventing the second would be
 * telling a screen reader something the author never said.
 */
export function colorName(color: MarkColor, lang: UiLang) {
  const names: Record<MarkColor, [string, string, string]> = {
    RED: ["Vermelho", "Red", "Rojo"],
    ORANGE: ["Laranja", "Orange", "Naranja"],
    YELLOW: ["Amarelo", "Yellow", "Amarillo"],
    GREEN: ["Verde", "Green", "Verde"],
    CYAN: ["Ciano", "Cyan", "Cian"],
    BLUE: ["Azul", "Blue", "Azul"],
    PURPLE: ["Roxo", "Purple", "Morado"],
    PINK: ["Rosa", "Pink", "Rosa"],
    NEUTRAL: ["Neutro", "Neutral", "Neutro"],
  };
  return tri(lang, ...names[color]);
}

/** What was done to an item, said plainly, for a label or a title. */
export function markName(mark: ItemMark, lang: UiLang) {
  if (mark.mark_mode === "DIM")
    return tri(lang, "Ofuscado", "Dimmed", "Atenuado");
  if (mark.mark_mode === "COLOR" && mark.mark_color)
    return tri(
      lang,
      `Destacado em ${colorName(mark.mark_color, lang).toLowerCase()}`,
      `Highlighted in ${colorName(mark.mark_color, lang).toLowerCase()}`,
      `Destacado en ${colorName(mark.mark_color, lang).toLowerCase()}`,
    );
  return tri(lang, "Sem destaque", "No highlight", "Sin destacado");
}
