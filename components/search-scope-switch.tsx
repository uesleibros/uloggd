"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EntitySearchClient } from "@/components/entity-search-client";
import type { SearchScope } from "@/components/search-scope-tabs";
import type { UiLang } from "@/lib/ui-text";

/**
 * Which kind of search is on screen, decided in the browser.
 *
 * The scope used to be read on the server, so every tab was a render of the
 * whole page: the frame, the hero, the tabs and the workspace were thrown away
 * and built again to change one word in the URL, and what was on screen was
 * replaced by the route's skeleton while that happened.
 *
 * Reviews, lists, tierlists, people and companies need nothing from the server
 * but the reader's id, and they fetch their own results anyway, so switching
 * between them is a change of address and nothing more. Games is the one
 * exception: its filters carry lists of platforms, genres and engines that are
 * read from IGDB, so that tab stays a real navigation and the page arrives
 * with them.
 *
 * `children` is whatever the server rendered for the scope the page was opened
 * at, which is why the first paint is unchanged and no second copy of that
 * workspace is ever built.
 */
export function SearchScopeSwitch({
  serverScope,
  lang,
  viewerId,
  children,
}: {
  serverScope: SearchScope;
  lang: UiLang;
  viewerId: string | null;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const asked = params?.get("scope");
  const scope: SearchScope =
    asked === "reviews" ||
    asked === "lists" ||
    asked === "tierlists" ||
    asked === "people" ||
    asked === "companies"
      ? asked
      : "games";
  const needsServer = scope === "games" && serverScope !== "games";

  // Back and forward can still land on games from a page that was not opened
  // there, and that one cannot be drawn without what the server reads. Asking
  // for this address again is exactly what the tab would have done.
  useEffect(() => {
    if (needsServer) router.refresh();
  }, [needsServer, router]);

  if (scope === serverScope || needsServer || scope === "games")
    return <>{children}</>;
  return (
    <EntitySearchClient
      // One instance per scope. The results keep their last answer while the
      // next loads, and an answer from another scope is the wrong shape: lists
      // drawn as people would break the card, not merely look stale.
      key={scope}
      lang={lang}
      scope={scope}
      serverScope={serverScope}
      viewerId={viewerId}
    />
  );
}
