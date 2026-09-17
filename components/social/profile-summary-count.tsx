"use client";

import { useApi } from "@/lib/use-api";
import type { ProfileSummary } from "@/lib/profile-types";

/**
 * One number from a profile's summary, filled in once it arrives.
 *
 * The workspace heroes print counts beside their titles, and the page used to
 * wait on that read before sending anything at all. The title and the shape of
 * the hero are known from the profile alone, so they go out immediately and the
 * numbers land a moment later.
 *
 * An ellipsis rather than a zero while it loads: zero is an answer, and telling
 * somebody with sixty reviews that they have none, even briefly, is worse than
 * telling them nothing yet.
 *
 * Every counter on a page asks for the same summary, and `api.get` shares a read
 * already in flight, so they cost one request between them.
 */
export function ProfileSummaryCount({
  username,
  field,
}: {
  username: string;
  /** Which of the summary's counts to print. */
  field: keyof ProfileSummary;
}) {
  const summary = useApi<{ data: ProfileSummary }>(
    `/profiles/${encodeURIComponent(username)}/summary`,
  );
  const value = summary.payload?.data[field];
  if (summary.loading) return <>...</>;
  return <>{typeof value === "number" ? value : 0}</>;
}

/** The same number, as a value rather than an element. */
export function useProfileSummary(username: string) {
  return useApi<{ data: ProfileSummary }>(
    `/profiles/${encodeURIComponent(username)}/summary`,
  );
}
