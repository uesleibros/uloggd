import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A copy of a game: what somebody owns, or has access to.
 *
 * The naming, the reading and the "is this one I already have" question, in
 * one place and free of the server, because the API and the interface both
 * have to answer them the same way and a test has to be able to ask.
 */

export type Copy = {
  id: string;
  igdb_id: number;
  game_slug: string;
  platform_id: number | null;
  platform_name: string | null;
  storefront: string | null;
  ownership: string | null;
  medium: string | null;
  edition: string | null;
  region: string | null;
  note: string | null;
  acquired_on: string | null;
};

/** What a caller may send about a copy, all of it optional but the game. */
export type CopyDraft = {
  platform_id?: number | null;
  platform_name?: string | null;
  storefront?: string | null;
  ownership?: string | null;
  medium?: string | null;
  edition?: string | null;
  region?: string | null;
};

const STOREFRONT_NAMES: Record<string, [string, string, string]> = {
  STEAM: ["Steam", "Steam", "Steam"],
  PLAYSTATION: ["PlayStation Store", "PlayStation Store", "PlayStation Store"],
  NINTENDO: ["Nintendo eShop", "Nintendo eShop", "Nintendo eShop"],
  XBOX: ["Xbox Store", "Xbox Store", "Xbox Store"],
  GOG: ["GOG", "GOG", "GOG"],
  EPIC: ["Epic Games", "Epic Games", "Epic Games"],
  ITCH: ["itch.io", "itch.io", "itch.io"],
  NUUVEM: ["Nuuvem", "Nuuvem", "Nuuvem"],
  BATTLE_NET: ["Battle.net", "Battle.net", "Battle.net"],
  UBISOFT: ["Ubisoft Connect", "Ubisoft Connect", "Ubisoft Connect"],
  EA: ["EA App", "EA App", "EA App"],
  AMAZON: ["Amazon", "Amazon", "Amazon"],
  HUMBLE: ["Humble", "Humble", "Humble"],
  GOOGLE_PLAY: ["Google Play", "Google Play", "Google Play"],
  APP_STORE: ["App Store", "App Store", "App Store"],
  RETAIL: ["Loja física", "Retail", "Tienda física"],
  OTHER: ["Outra", "Other", "Otra"],
};

const OWNERSHIP_NAMES: Record<string, [string, string, string]> = {
  OWNED: ["Comprado", "Owned", "Comprado"],
  SUBSCRIPTION: ["Assinatura", "Subscription", "Suscripción"],
  BORROWED: ["Emprestado", "Borrowed", "Prestado"],
  RENTED: ["Alugado", "Rented", "Alquilado"],
  SHARED: ["Compartilhado", "Shared", "Compartido"],
  PREVIOUSLY_OWNED: ["Já tive", "Previously owned", "Lo tuve"],
};

const MEDIUM_NAMES: Record<string, [string, string, string]> = {
  PHYSICAL: ["Físico", "Physical", "Físico"],
  DIGITAL: ["Digital", "Digital", "Digital"],
};

export function storefrontLabel(value: string, lang: UiLang) {
  const name = STOREFRONT_NAMES[value];
  return name ? tri(lang, ...name) : value;
}

export function ownershipLabel(value: string, lang: UiLang) {
  const name = OWNERSHIP_NAMES[value];
  return name ? tri(lang, ...name) : value;
}

export function mediumLabel(value: string, lang: UiLang) {
  const name = MEDIUM_NAMES[value];
  return name ? tri(lang, ...name) : value;
}

/**
 * One line that says what a copy is: "PS5 · Digital · PlayStation Store".
 *
 * Platform first because it is the one thing most people record, and the
 * empty parts are left out rather than written as "unknown": a copy with a
 * platform and nothing else should read as a platform, not as a form with
 * four blanks in it.
 */
export function copyLabel(copy: Copy, lang: UiLang) {
  const parts = [
    copy.platform_name,
    copy.medium ? mediumLabel(copy.medium, lang) : null,
    copy.storefront ? storefrontLabel(copy.storefront, lang) : null,
    copy.edition,
  ].filter(Boolean) as string[];
  if (!parts.length)
    return tri(
      lang,
      "Cópia sem detalhes",
      "Copy with no details",
      "Copia sin detalles",
    );
  return parts.join(" · ");
}

/** The second line, for a card that has room for one. */
export function copyDetail(copy: Copy, lang: UiLang) {
  return (
    [
      copy.ownership ? ownershipLabel(copy.ownership, lang) : null,
      copy.region,
      copy.acquired_on ? copy.acquired_on.slice(0, 4) : null,
    ].filter(Boolean) as string[]
  ).join(" · ");
}

/**
 * Whether a draft is asking for a copy somebody already has.
 *
 * Only the fields the draft actually names are compared. Somebody picking
 * "PS5" on a run when they already recorded a PS5 copy means that copy, not a
 * second one, and answering with a new row every time is how a library ends
 * up with nine identical PlayStation 5 entries nobody asked for.
 *
 * A field the draft leaves out is not a difference: "PS5" matches a copy that
 * says PS5, digital, PlayStation Store. A field the draft names and the copy
 * contradicts is a difference, so "PS5 physical" does not match it.
 *
 * Nothing here prevents two identical copies existing. People do own two
 * physical copies of the same game, and the caller can say so explicitly.
 */
export function matchingCopy(copies: Copy[], draft: CopyDraft): Copy | null {
  const asked = [
    ["platform_id", draft.platform_id] as const,
    ["storefront", draft.storefront] as const,
    ["ownership", draft.ownership] as const,
    ["medium", draft.medium] as const,
    ["edition", draft.edition] as const,
    ["region", draft.region] as const,
  ].filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!asked.length) return null;

  return (
    copies.find((copy) =>
      asked.every(([field, value]) => {
        const held = copy[field as keyof Copy];
        if (held === null || held === undefined) return false;
        if (field === "edition" || field === "region")
          return (
            String(held).trim().toLowerCase() ===
            String(value).trim().toLowerCase()
          );
        return String(held) === String(value);
      }),
    ) ?? null
  );
}
