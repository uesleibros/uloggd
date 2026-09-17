"use client";

import { useApi } from "@/lib/use-api";
import { EmptyLibraryCallout } from "@/components/home/empty-library-callout";
import type { LibrarySnapshot } from "@/lib/library-state";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How much this account has, which is three numbers and one question.
 *
 * Asked without any ids, which the route reads as "the summary alone": the
 * counts are over the whole library rather than over the ids, so there is a real
 * question here without a game to name. Both readers below ask for it and
 * `api.get` shares a read already in flight, so it is one request.
 */
const SUMMARY = "/library/cards";

/** The three counters in the right rail. */
export function ViewerLibraryCounters({
  lang,
  viewerId,
}: {
  lang: UiLang;
  viewerId: string | null;
}) {
  const summary = useApi<LibrarySnapshot>(viewerId ? SUMMARY : null);
  const counts = summary.payload?.summary;

  // An ellipsis rather than a zero while it loads. Zero is an answer, and
  // telling somebody with forty games that they have none, even for half a
  // second, is worse than telling them nothing yet.
  const show = (value: number | undefined) =>
    summary.loading ? "..." : (value ?? 0);

  return (
    <dl className="rail-library-stats">
      <div>
        <dt>{tri(lang, "Jogos", "Games", "Juegos")}</dt>
        <dd>{show(counts?.library)}</dd>
      </div>
      <div>
        <dt>{tri(lang, "Jogando", "Playing", "Jugando")}</dt>
        <dd>{show(counts?.playing)}</dd>
      </div>
      <div>
        <dt>{tri(lang, "Avaliados", "Rated", "Valorados")}</dt>
        <dd>{show(counts?.rated)}</dd>
      </div>
    </dl>
  );
}

/**
 * The note for an account with nothing in its library.
 *
 * It sits exactly where the shelves that need a library would be, so the answer
 * to "why is this page empty" is in the hole rather than somewhere else. Which
 * means it may not appear while the count is unknown: an empty-library note that
 * flashes onto a stocked library reads as a bug.
 */
export function ViewerEmptyLibrary({
  lang,
  viewerId,
}: {
  lang: UiLang;
  viewerId: string | null;
}) {
  const summary = useApi<LibrarySnapshot>(viewerId ? SUMMARY : null);
  if (!viewerId || summary.loading) return null;
  if (summary.payload?.summary.library !== 0) return null;
  return <EmptyLibraryCallout lang={lang} />;
}
