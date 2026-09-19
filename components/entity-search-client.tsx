"use client";

import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/use-api";
import { EntitySearchWorkspace } from "@/components/entity-search-workspace";
import type { SearchScope } from "@/components/search-scope-tabs";
import type { SocialEntry } from "@/components/social/activity-stream";
import type { ConnectionPerson } from "@/components/social/connection-card";
import type { CompanySearchResult } from "@/lib/igdb";
import type { ListPreview } from "@/lib/lists-types";
import type { ProfileLevel } from "@/lib/profile-level";
import type { UiLang } from "@/lib/ui-text";

type EntityScope = Exclude<SearchScope, "games">;

/** Reviews are long, so a page of them is shorter than a page of cards. */
const REVIEWS_PER_PAGE = 20;
const CARDS_PER_PAGE = 24;

type Answer = {
  data: unknown[];
  total: number;
  total_pages?: number;
  levels?: (ProfileLevel & { profile_id: string })[];
  shared?: { profile_id: string; shared_games: number }[];
};

function page(value: string | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 100
    ? parsed
    : 1;
}

/**
 * Reviews, people, lists, tierlists and companies, searched from the browser.
 *
 * These were searched by the page on the server, so each scope waited on its
 * query before anything was drawn, and every sort, filter and page was a
 * render of the whole page. The frame is drawn at once now and the results
 * come from the same `/api/v1/search/*` addresses an integration would use.
 * The URL is still the search, read here with the same rules the page had, so
 * a link to a filtered search still lands on it.
 */
export function EntitySearchClient({
  lang,
  scope,
  viewerId,
}: {
  lang: UiLang;
  scope: EntityScope;
  viewerId: string | null;
}) {
  const params = useSearchParams();
  const query = (params.get("q") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const current = page(params.get("page"));
  const requestedSort = params.get("sort");

  let sort: string;
  let address: string;
  let role = "any";
  let status = "any";
  let verified = false;

  if (scope === "reviews") {
    sort =
      requestedSort === "oldest" || requestedSort === "rating"
        ? requestedSort
        : "recent";
    address = `/search/reviews?${new URLSearchParams({ q: query, sort, page: String(current) })}`;
  } else if (scope === "companies") {
    role =
      params.get("role") === "publisher" || params.get("role") === "developer"
        ? (params.get("role") as string)
        : "any";
    status = params.get("status") === "active" ? "active" : "any";
    sort = ["relevance", "catalog", "name", "oldest", "newest"].includes(
      requestedSort ?? "",
    )
      ? (requestedSort as string)
      : "relevance";
    address = `/search/companies?${new URLSearchParams({ q: query, role, status, sort, page: String(current) })}`;
  } else if (scope === "people") {
    verified = params.get("verified") === "1";
    sort =
      requestedSort === "name" || requestedSort === "newest"
        ? requestedSort
        : "relevance";
    address = `/search/people?${new URLSearchParams({ q: query, sort, page: String(current), verified: verified ? "1" : "0" })}`;
  } else {
    sort =
      requestedSort === "name" || requestedSort === "oldest"
        ? requestedSort
        : "recent";
    address = `/search/lists?${new URLSearchParams({ q: query, sort, page: String(current), kind: scope === "tierlists" ? "TIERLIST" : "COLLECTION" })}`;
  }

  // The last answer stays while the next one loads, so a sort or a page number
  // dims the results rather than swapping them for a skeleton.
  const answer = useApi<Answer>(address, { keepPrevious: true });
  const found = answer.payload;
  const total = found?.total ?? 0;
  const perPage = scope === "reviews" ? REVIEWS_PER_PAGE : CARDS_PER_PAGE;
  const totalPages = found?.total_pages ?? Math.ceil(total / perPage);
  const data = found?.data ?? [];

  return (
    <EntitySearchWorkspace
      lang={lang}
      scope={scope}
      query={query}
      sort={sort}
      role={role}
      status={status}
      verified={verified}
      page={
        scope === "companies"
          ? Math.min(current, Math.max(1, totalPages))
          : current
      }
      total={total}
      totalPages={totalPages}
      viewerId={viewerId}
      loading={answer.loading && !found}
      stale={answer.stale}
      entries={scope === "reviews" ? (data as SocialEntry[]) : undefined}
      companies={
        scope === "companies" ? (data as CompanySearchResult[]) : undefined
      }
      people={scope === "people" ? (data as ConnectionPerson[]) : undefined}
      lists={
        scope === "lists" || scope === "tierlists"
          ? (data as ListPreview[])
          : undefined
      }
      levels={
        scope === "people"
          ? new Map(
              (found?.levels ?? []).map((level) => [level.profile_id, level]),
            )
          : undefined
      }
      sharedGames={
        scope === "people"
          ? new Map(
              (found?.shared ?? []).map((row) => [
                row.profile_id,
                Number(row.shared_games),
              ]),
            )
          : undefined
      }
    />
  );
}
