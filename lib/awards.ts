import { tri, type UiLang } from "@/lib/ui-text";
import { isVisibility, type Visibility } from "@/lib/visibility";

export const AWARD_LIMITS = {
  categories: 30,
  nominees: 20,
  name: 100,
  rules: 5000,
} as const;
export type AwardCategory = {
  id: string;
  name: string;
  description: string;
  max_nominees: number;
  nominees: number[];
  winner: number | null;
};
export type AwardDocument = {
  name: string;
  year: number;
  mode: "PERSONAL" | "PREDICTIONS";
  rules: string;
  source: "CATALOG" | "LIST" | "PLAYED_YEAR";
  source_list_id: string | null;
  visibility: Visibility;
  status: "DRAFT" | "PUBLISHED";
  categories: AwardCategory[];
};
export type AwardRecord = AwardDocument & {
  id: string;
  public_id: string;
  profile_id: string;
  version: number;
  created_at: string;
  updated_at: string;
};
export type AwardGame = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string;
};
export type AwardAnswer = {
  data: AwardRecord;
  owned: boolean;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  };
  games: AwardGame[];
  invalid_ids: number[];
  source_list: { public_id: string; name: string } | null;
};
export type AwardPreview = Pick<
  AwardRecord,
  | "public_id"
  | "name"
  | "year"
  | "mode"
  | "status"
  | "visibility"
  | "updated_at"
> & {
  category_count: number;
  winner_count: number;
  author: AwardAnswer["author"];
};

export class AwardValidationError extends Error {}

export function parseAward(value: unknown): AwardDocument {
  const fail = (field: string): never => {
    throw new AwardValidationError(field);
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail("document");
  const raw = value as Record<string, unknown>;
  const text = (v: unknown, field: string, max: number, required = false) => {
    if (typeof v !== "string" || v.length > max || (required && !v.trim()))
      return fail(field);
    return v.trim();
  };
  const name = text(raw.name, "name", AWARD_LIMITS.name, true);
  if (
    !Number.isInteger(raw.year) ||
    Number(raw.year) < 1970 ||
    Number(raw.year) > 9999
  )
    return fail("year");
  if (raw.mode !== "PERSONAL" && raw.mode !== "PREDICTIONS")
    return fail("mode");
  if (!["CATALOG", "LIST", "PLAYED_YEAR"].includes(String(raw.source)))
    return fail("source");
  if (!isVisibility(raw.visibility)) return fail("visibility");
  if (raw.status !== "DRAFT" && raw.status !== "PUBLISHED")
    return fail("status");
  if (
    raw.source === "LIST" &&
    (typeof raw.source_list_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        raw.source_list_id,
      ))
  )
    return fail("source_list_id");
  if (
    !Array.isArray(raw.categories) ||
    raw.categories.length < 1 ||
    raw.categories.length > AWARD_LIMITS.categories
  )
    return fail("categories");
  const seen = new Set<string>();
  const categories = raw.categories.map((v): AwardCategory => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      return fail("category");
    const c = v as Record<string, unknown>;
    const id = text(c.id, "category_id", 36, true);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      seen.has(id.toLowerCase())
    )
      return fail("category_id");
    seen.add(id.toLowerCase());
    const max = Number(c.max_nominees);
    if (
      !Number.isInteger(c.max_nominees) ||
      max < 1 ||
      max > AWARD_LIMITS.nominees
    )
      return fail("max_nominees");
    if (
      !Array.isArray(c.nominees) ||
      c.nominees.length > max ||
      c.nominees.some(
        (n) => !Number.isInteger(n) || n <= 0 || n > 2147483647,
      ) ||
      new Set(c.nominees).size !== c.nominees.length
    )
      return fail("nominees");
    if (
      c.winner !== null &&
      (!Number.isInteger(c.winner) || !c.nominees.includes(c.winner))
    )
      return fail("winner");
    return {
      id,
      name: text(c.name, "category_name", 100, true),
      description: text(c.description, "category_description", 1000),
      max_nominees: max,
      nominees: c.nominees,
      winner: c.winner as number | null,
    };
  });
  if (raw.status === "PUBLISHED" && categories.some((c) => !c.nominees.length))
    return fail("empty_categories");
  return {
    name,
    year: Number(raw.year),
    mode: raw.mode,
    source: raw.source as AwardDocument["source"],
    source_list_id: raw.source === "LIST" ? String(raw.source_list_id) : null,
    rules: text(raw.rules, "rules", AWARD_LIMITS.rules),
    visibility: raw.visibility,
    status: raw.status,
    categories,
  };
}

export function awardGameIds(categories: AwardCategory[]) {
  return [...new Set(categories.flatMap((category) => category.nominees))];
}

export function newAwardCategory(
  name: string,
  id: string,
  max = 5,
): AwardCategory {
  return {
    id,
    name,
    description: "",
    max_nominees: max,
    nominees: [],
    winner: null,
  };
}

export function awardPreset(
  preset: "personal" | "tga" | "blank",
  lang: UiLang,
  id: () => string,
): AwardCategory[] {
  const names =
    preset === "blank"
      ? [tri(lang, "Jogo do ano", "Game of the year", "Juego del año")]
      : [
          tri(lang, "Jogo do ano", "Game of the year", "Juego del año"),
          tri(lang, "Melhor narrativa", "Best narrative", "Mejor narrativa"),
          tri(
            lang,
            "Melhor direção de arte",
            "Best art direction",
            "Mejor dirección de arte",
          ),
          tri(
            lang,
            "Melhor trilha sonora",
            "Best score and music",
            "Mejor banda sonora",
          ),
          tri(
            lang,
            "Melhor jogo independente",
            "Best independent game",
            "Mejor juego independiente",
          ),
          ...(preset === "tga"
            ? [
                tri(
                  lang,
                  "Melhor direção",
                  "Best game direction",
                  "Mejor dirección",
                ),
                tri(
                  lang,
                  "Melhor design de áudio",
                  "Best audio design",
                  "Mejor diseño de audio",
                ),
                tri(lang, "Melhor RPG", "Best RPG", "Mejor RPG"),
                tri(
                  lang,
                  "Melhor jogo de ação",
                  "Best action game",
                  "Mejor juego de acción",
                ),
                tri(
                  lang,
                  "Melhor ação e aventura",
                  "Best action/adventure",
                  "Mejor acción y aventura",
                ),
                tri(
                  lang,
                  "Melhor jogo de luta",
                  "Best fighting game",
                  "Mejor juego de lucha",
                ),
                tri(
                  lang,
                  "Melhor multiplayer",
                  "Best multiplayer",
                  "Mejor multijugador",
                ),
              ]
            : [
                tri(lang, "Melhor surpresa", "Best surprise", "Mejor sorpresa"),
              ]),
        ];
  return names.map((name, index) =>
    newAwardCategory(name, id(), preset === "tga" && index === 0 ? 6 : 5),
  );
}

export function awardsLabel(lang: UiLang) {
  return tri(lang, "Premiações", "Awards", "Premios");
}
export function awardModeLabel(mode: AwardDocument["mode"], lang: UiLang) {
  return mode === "PREDICTIONS"
    ? tri(lang, "Previsões", "Predictions", "Predicciones")
    : tri(lang, "Meus vencedores", "My winners", "Mis ganadores");
}
