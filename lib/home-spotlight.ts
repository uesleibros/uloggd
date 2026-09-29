import { calendarDateFromSeconds } from "@/lib/dates";
import { tri, type UiLang } from "@/lib/ui-text";
import type { Game } from "@/lib/igdb";

/**
 * What the band at the top of the home page is for.
 *
 * It held the page's own name, a sentence describing the site to somebody
 * already using it, and two links: a hundred and sixty pixels of chrome
 * saying nothing a reader did not know. The band stays, because the two links
 * are worth having where the eye starts, and it now carries one real thing:
 * the next game the catalogue is waiting on.
 *
 * Nothing here is curated. The site already reads what is about to come out,
 * what people are following and what is being logged, and this picks the
 * nearest of those with a picture behind it. When the catalogue is unreachable
 * there is no spotlight and the band falls back to its sentence, which is the
 * honest empty state: a banner with nothing in it is worse than a line of
 * text.
 */
export type Spotlight = {
  game: Game;
  /** Why this game is here: a date, or that people are waiting on it. */
  kicker: string;
  /** One fact under the name, or null when the catalogue offered none. */
  fact: string | null;
};

/**
 * Picks it, from what the home page has already read.
 *
 * The nearest release first, because a date is the most useful thing a
 * spotlight can say; then the most awaited, then the most logged. A game
 * without artwork can still be the spotlight, and the band then reads as a
 * line of text rather than a banner, which is what it did before anyway.
 */
export function chooseSpotlight(
  lang: UiLang,
  candidates: { upcoming: Game[]; anticipated: Game[]; popular: Game[] },
  communityRatings: Map<number, { rating: number; count: number }>,
): Spotlight | null {
  const withArt = (games: Game[]) => games.find((game) => game.heroUrl);
  const game =
    withArt(candidates.upcoming) ??
    withArt(candidates.anticipated) ??
    withArt(candidates.popular) ??
    candidates.upcoming[0] ??
    candidates.anticipated[0] ??
    candidates.popular[0];
  if (!game) return null;

  const now = Date.now() / 1000;
  const unreleased = game.releaseTimestamp && game.releaseTimestamp > now;
  const kicker = unreleased
    ? tri(lang, "Chega em", "Out on", "Llega el") +
      " " +
      calendarDateFromSeconds(game.releaseTimestamp!, lang, "long")
    : tri(lang, "Em alta agora", "Big right now", "En alza ahora");

  const community = communityRatings.get(game.id);
  const fact = unreleased
    ? game.hype > 0
      ? `${game.hype.toLocaleString(lang)} ${tri(lang, "pessoas esperando", "people waiting", "personas esperando")}`
      : null
    : community && community.count > 0
      ? `${community.rating}/100 ${tri(lang, "no uloggd", "on uloggd", "en uloggd")} · ${community.count.toLocaleString(lang)} ${tri(lang, "avaliações", "ratings", "valoraciones")}`
      : typeof game.rating === "number"
        ? `IGDB ${Math.round(game.rating)}/100`
        : null;

  return { game, kicker, fact };
}
