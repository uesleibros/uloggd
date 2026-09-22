"use client";

import { useApi } from "@/lib/use-api";
import { EmptyLibraryCallout } from "@/components/home/empty-library-callout";
import type { LibrarySnapshot } from "@/lib/library-state";
import type { UiLang } from "@/lib/ui-text";

/**
 * Whether this account has anything in its library yet.
 *
 * Asked without any ids, which the route reads as "the summary alone": the
 * counts are over the whole library rather than over the ids, so there is a real
 * question here without a game to name, and `api.get` shares a read already
 * in flight with anything else on the page that asks the same.
 */
const SUMMARY = "/library/cards";

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
