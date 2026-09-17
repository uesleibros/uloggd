"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Layers3, Star } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useProfileSummary } from "@/components/social/profile-summary-count";
import {
  ActivityStream,
  type SocialEntry,
} from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { ShelfSkeleton } from "@/components/home/shelf-skeleton";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const PAGE = 40;

type ArchiveType = "all" | "review" | "diary";

/**
 * Somebody's reviews and journeys, with the filter that switches between them.
 *
 * The page used to read the archive on the server and answer with it, which
 * meant two things: nothing was on screen until the read finished, and every tab
 * was a round trip to the server for a page that is otherwise identical. The
 * tabs still carry real links, because a filtered archive is worth sharing and
 * worth landing on, but the frame around them no longer waits on anything and
 * the switch is a read rather than a render.
 */
export function ProfileArchive({
  username,
  profileId,
  lang,
  viewerId,
  base,
}: {
  username: string;
  profileId: string;
  lang: UiLang;
  viewerId: string | null;
  /** Where the tabs point, which is this page. */
  base: string;
}) {
  const t = uiText(lang);
  const requested = useSearchParams().get("type");
  const type: ArchiveType =
    requested === "review" || requested === "diary" ? requested : "all";

  const summary = useProfileSummary(username);
  const reviews = summary.payload?.data.reviews ?? 0;
  const diary = summary.payload?.data.diary ?? 0;

  const archive = useApi<{ data: SocialEntry[] }>(
    `/profiles/${encodeURIComponent(username)}/reviews?limit=${PAGE}&kinds=${
      type === "all" ? "review,diary" : type
    }`,
  );
  const entries = archive.payload?.data ?? [];

  const count = (value: number) => (summary.loading ? "..." : value);

  return (
    <>
      <nav
        className="game-page-nav reviews-scope-tabs"
        aria-label={tri(lang, "Filtrar arquivo", "Filter archive", "Filtrar archivo")}
      >
        {(
          [
            {
              value: "all",
              label: tri(lang, "Tudo", "All", "Todo"),
              icon: <Layers3 size={14} />,
              total: reviews + diary,
            },
            {
              value: "review",
              label: t.reviews,
              icon: <Star size={14} />,
              total: reviews,
            },
            {
              value: "diary",
              label: t.sessions,
              icon: <CalendarDays size={14} />,
              total: diary,
            },
          ] as const
        ).map((item) => (
          <Link
            key={item.value}
            href={item.value === "all" ? base : `${base}?type=${item.value}`}
            aria-current={type === item.value ? "page" : undefined}
          >
            {item.icon}
            {item.label}
            <b>{count(item.total)}</b>
          </Link>
        ))}
      </nav>

      {archive.loading ? (
        <ShelfSkeleton layout="rows" count={4} />
      ) : (
        <>
          <ActivityStream entries={entries} lang={lang} viewerId={viewerId} />
          <LoadMoreActivity
            lang={lang}
            viewerId={viewerId}
            profileId={profileId}
            kind={type === "all" ? undefined : type}
            pageSize={PAGE}
            initialCursor={
              entries.length ? entries[entries.length - 1].createdAt : null
            }
            hasMore={entries.length === PAGE}
          />
        </>
      )}
    </>
  );
}
