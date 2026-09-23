import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Map as MapIcon,
  Star,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerReviewArchive } from "@/components/social/owner-review-archive";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getGamesByIds } from "@/lib/igdb";
import { serverApi } from "@/lib/api-server";
import type { PublicProfile } from "@/lib/profile-types";
import { tri, uiText } from "@/lib/ui-text";

type WorkspaceIndexRow = {
  entry_kind: "review" | "diary";
  igdb_id: number;
  game_slug: string;
  entry_count: number;
  rated_count: number;
  rating_sum: number;
};

export async function ReviewsWorkspacePage({
  lang,
  userId,
  profile,
}: {
  lang: "pt-BR" | "en" | "es";
  userId: string;
  profile: PublicProfile;
}) {
  // What does not change with the filters: the archive's totals and the
  // games it covers. The entries themselves are read by the browser, per
  // filter (see OwnerReviewArchive).
  const summary = await serverApi.get<{
    data: WorkspaceIndexRow[];
    journeys: number;
  }>("/reviews/summary");
  const profileUsername = profile?.username;
  if (!profileUsername) redirect(`/${lang}/onboarding/username`);
  const workspaceIndex = { data: summary.data };
  const journeyCount = { count: summary.journeys };

  const indexRows = (workspaceIndex.data ?? []) as WorkspaceIndexRow[];
  const gameIds = [...new Set(indexRows.map((row) => row.igdb_id))];
  const games = await getGamesByIds(gameIds);
  const gameById = new Map(games.map((item) => [item.id, item]));
  const gameCounts = new Map<number, number>();
  const slugByGame = new Map<number, string>();
  for (const row of indexRows) {
    gameCounts.set(
      row.igdb_id,
      (gameCounts.get(row.igdb_id) ?? 0) + Number(row.entry_count),
    );
    if (!slugByGame.has(row.igdb_id))
      slugByGame.set(row.igdb_id, row.game_slug);
  }
  const gameOptions = [...gameCounts]
    .map(([id, count]) => ({
      id,
      count,
      name: gameById.get(id)?.name ?? slugByGame.get(id) ?? String(id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));

  const reviewRows = indexRows.filter((row) => row.entry_kind === "review");
  const diaryRows = indexRows.filter((row) => row.entry_kind === "diary");
  const reviewCount = reviewRows.reduce(
    (sum, row) => sum + Number(row.entry_count),
    0,
  );
  const sessionCount = diaryRows.reduce(
    (sum, row) => sum + Number(row.entry_count),
    0,
  );
  const ratedCount = reviewRows.reduce(
    (sum, row) => sum + Number(row.rated_count),
    0,
  );
  const ratingSum = reviewRows.reduce(
    (sum, row) => sum + Number(row.rating_sum),
    0,
  );
  const average = ratedCount ? ratingSum / ratedCount / 20 : null;
  const t = uiText(lang);
  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          "Avaliações e jornadas",
          "Reviews & journeys",
          "Reseñas y recorridos",
        )}
        description={tri(
          lang,
          "Seu arquivo crítico: opiniões, sessões e cada caminho percorrido por jogo.",
          "Your critical archive: opinions, sessions, and every path taken through a game.",
          "Tu archivo crítico: opiniones, sesiones y cada camino recorrido por juego.",
        )}
        stats={[
          {
            icon: <BookOpen size={14} />,
            label: t.reviews,
            value: reviewCount,
          },
          {
            icon: <Star size={14} />,
            label: tri(lang, "Nota média", "Average", "Nota media"),
            value:
              average === null
                ? "-"
                : `${average.toLocaleString(lang, { maximumFractionDigits: 1 })}/5`,
          },
          {
            icon: <MapIcon size={14} />,
            label: tri(lang, "Jornadas", "Journeys", "Recorridos"),
            value: journeyCount.count ?? 0,
          },
          {
            icon: <CalendarDays size={14} />,
            label: t.sessions,
            value: sessionCount,
          },
        ]}
      />
      <div className="workspace-page-body reviews-workspace">
        {/* The owner's view lacked this while the public one had it. Arriving
            from the sidebar means there is no profile page behind you to go
            back to, so the link matters more here, not less. */}
        {profileUsername && (
          <Link
            className="page-back-link"
            href={`/${lang}/u/${profileUsername}`}
          >
            <ArrowLeft size={15} /> {t.backToProfile}
          </Link>
        )}
        <OwnerReviewArchive
          lang={lang}
          userId={userId}
          username={profileUsername}
          reviewCount={reviewCount}
          sessionCount={sessionCount}
          games={gameOptions}
        />
      </div>
    </main>
  );
}
