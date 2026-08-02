"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { useProfileLevels } from "@/lib/use-profile-levels";
import type { ProfileLevel } from "@/lib/profile-level";
import type { UiLang } from "@/lib/ui-text";

/**
 * Levels for one activity stream, fetched once and read by every byline in it.
 *
 * The stream is rendered from server pages and from `LoadMoreActivity`, which
 * is a client component, so it can be neither async nor given the levels as a
 * prop without threading them through seven call sites and four pages. A
 * client provider around the list solves both: it makes exactly one request
 * per stream, and the badges inside read it wherever the surrounding markup
 * was rendered.
 */
const StreamLevels = createContext<Map<string, ProfileLevel>>(new Map());

export function StreamLevelProvider({
  profileIds,
  children,
}: {
  profileIds: string[];
  children: ReactNode;
}) {
  const levels = useProfileLevels(profileIds);
  return (
    <StreamLevels.Provider value={levels}>{children}</StreamLevels.Provider>
  );
}

/**
 * The badge for one author in the stream.
 *
 * Renders nothing until the levels arrive, so the byline never reserves an
 * empty circle and never shifts when it fills.
 */
export function StreamLevelBadge({
  profileId,
  lang,
}: {
  profileId: string;
  lang: UiLang;
}) {
  const standing = useContext(StreamLevels).get(profileId);
  if (!standing) return null;
  return (
    <ProfileLevelBadge lang={lang} standing={standing} profileId={profileId} />
  );
}
