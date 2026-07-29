import {
  BookOpen,
  CalendarDays,
  Layers3,
  Map as MapIcon,
  Star,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityStream } from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { ReviewGameArchive } from "@/components/social/review-game-archive";
import {
  ReviewWorkspaceControls,
  type ReviewWorkspaceState,
} from "@/components/social/review-workspace-controls";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getGamesByIds } from "@/lib/igdb";
import { getActivity } from "@/lib/social";
import { getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";

const RATING_FILTERS = new Set([
  "all",
  "rated",
  "great",
  "positive",
  "mixed",
  "low",
  "unrated",
]);
const SPOILER_FILTERS = new Set(["all", "hide", "only"]);
const ORDER_FILTERS = new Set(["recent", "oldest", "rating"]);

type RatingFilter =
  "all" | "rated" | "great" | "positive" | "mixed" | "low" | "unrated";
type SpoilerFilter = "all" | "hide" | "only";
type ReviewOrder = "recent" | "oldest" | "rating";
type WorkspaceIndexRow = {
  entry_kind: "review" | "diary";
  igdb_id: number;
  game_slug: string;
  entry_count: number;
  rated_count: number;
  rating_sum: number;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function ReviewsWorkspacePage({
  lang,
  requested,
  userId,
}: {
  lang: "pt-BR" | "en" | "es";
  requested: Record<string, string | string[] | undefined>;
  userId: string;
}) {
  const supabase = await getSupabase();
  const user = { id: userId };

  const requestedType = first(requested.type);
  const scope: ReviewWorkspaceState["scope"] =
    requestedType === "review"
      ? "review"
      : requestedType === "journey" || requestedType === "diary"
        ? "journey"
        : "all";
  const requestedGame = first(requested.game) ?? "all";
  const game = /^[1-9]\d{0,8}$/.test(requestedGame) ? requestedGame : "all";
  const requestedRating = first(requested.rating) ?? "all";
  const rating: RatingFilter = RATING_FILTERS.has(requestedRating)
    ? (requestedRating as RatingFilter)
    : "all";
  const requestedSpoilers = first(requested.spoilers) ?? "all";
  const spoilers: SpoilerFilter = SPOILER_FILTERS.has(requestedSpoilers)
    ? (requestedSpoilers as SpoilerFilter)
    : "all";
  const requestedOrder = first(requested.order) ?? "recent";
  const order: ReviewOrder =
    ORDER_FILTERS.has(requestedOrder) &&
    (requestedOrder !== "rating" || scope === "review")
      ? (requestedOrder as ReviewOrder)
      : "recent";
  const view = first(requested.view) === "games" ? "games" : "timeline";
  const query = (first(requested.q) ?? "").trim().slice(0, 80);
  const entryLimit = view === "games" || order === "rating" ? 180 : 60;
  const kinds: Array<"review" | "diary"> =
    scope === "review"
      ? ["review"]
      : scope === "journey"
        ? ["diary"]
        : rating === "all"
          ? ["review", "diary"]
          : ["review"];

  const [entries, { data: profile }, workspaceIndex, journeyCount] =
    await Promise.all([
      getActivity(supabase, {
        profileId: user.id,
        viewerId: user.id,
        limit: entryLimit,
        gameId: game === "all" ? undefined : Number(game),
        kinds,
        rating: scope === "journey" || rating === "all" ? undefined : rating,
        spoilers,
        order,
        search: query || undefined,
      }),
      supabase
        .from("profiles")
        .select("username,display_name,avatar_url,banner_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_review_workspace_index", {
        target_profile: user.id,
      }),
      supabase
        .from("journeys")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id),
    ]);
  const profileUsername = profile?.username;
  if (!profileUsername) redirect(`/${lang}/onboarding/username`);
  if (workspaceIndex.error) throw workspaceIndex.error;

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

  const visibleEntries = entries;
  const visibleCount =
    visibleEntries.length === entryLimit
      ? `${visibleEntries.length}+`
      : String(visibleEntries.length);
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
  const state: ReviewWorkspaceState = {
    scope,
    game,
    rating: scope === "journey" ? "all" : rating,
    spoilers,
    order,
    view,
    query,
  };

  function scopeHref(value: ReviewWorkspaceState["scope"]) {
    const next = new URLSearchParams();
    if (value !== "all") next.set("type", value);
    if (game !== "all") next.set("game", game);
    if (value !== "journey" && rating !== "all") next.set("rating", rating);
    if (spoilers !== "all") next.set("spoilers", spoilers);
    if (order !== "recent" && !(order === "rating" && value !== "review"))
      next.set("order", order);
    if (view === "games") next.set("view", "games");
    if (query) next.set("q", query);
    const search = next.toString();
    return `/${lang}/reviews/${profileUsername}${search ? `?${search}` : ""}`;
  }

  const canLoadMore = view === "timeline" && order !== "rating";

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
                ? "—"
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
        <nav
          className="game-page-nav reviews-scope-tabs"
          aria-label={tri(
            lang,
            "Filtrar arquivo",
            "Filter archive",
            "Filtrar archivo",
          )}
        >
          {[
            {
              value: "all" as const,
              label: tri(lang, "Tudo", "All", "Todo"),
              icon: <Layers3 size={14} />,
              count: reviewCount + sessionCount,
            },
            {
              value: "review" as const,
              label: t.reviews,
              icon: <Star size={14} />,
              count: reviewCount,
            },
            {
              value: "journey" as const,
              label: tri(lang, "Jornadas", "Journeys", "Recorridos"),
              icon: <MapIcon size={14} />,
              count: sessionCount,
            },
          ].map(({ value, label, icon, count }) => (
            <Link
              key={value}
              href={scopeHref(value)}
              aria-current={scope === value ? "page" : undefined}
            >
              {icon}
              {label}
              <b>{count}</b>
            </Link>
          ))}
        </nav>

        <ReviewWorkspaceControls
          key={state.query}
          lang={lang}
          state={state}
          games={gameOptions}
        />

        <header className="reviews-results-heading">
          <div>
            <span>
              {view === "games"
                ? tri(
                    lang,
                    "ARQUIVO POR JOGO",
                    "ARCHIVE BY GAME",
                    "ARCHIVO POR JUEGO",
                  )
                : tri(lang, "LINHA DO TEMPO", "TIMELINE", "CRONOLOGÍA")}
            </span>
            <h2>
              {tri(
                lang,
                `${visibleCount} ${visibleEntries.length === 1 ? "registro encontrado" : "registros encontrados"}`,
                `${visibleCount} ${visibleEntries.length === 1 ? "entry found" : "entries found"}`,
                `${visibleCount} ${visibleEntries.length === 1 ? "registro encontrado" : "registros encontrados"}`,
              )}
            </h2>
          </div>
          <p>
            {tri(
              lang,
              "Avaliações abrem a leitura completa; jornadas abrem todas as sessões vinculadas.",
              "Reviews open the full read; journeys open every linked session.",
              "Las reseñas abren la lectura completa; los recorridos abren todas sus sesiones.",
            )}
          </p>
        </header>

        {visibleEntries.length === 0 ? (
          <section className="reviews-filter-empty">
            <span aria-hidden>
              <BookOpen size={20} />
            </span>
            <h2>
              {tri(
                lang,
                "Nenhum registro encontrado",
                "No entries found",
                "No se encontraron registros",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Ajuste os filtros ou limpe a busca para voltar ao seu arquivo completo.",
                "Adjust the filters or clear the search to return to your complete archive.",
                "Ajusta los filtros o limpia la búsqueda para volver a tu archivo completo.",
              )}
            </p>
          </section>
        ) : view === "games" ? (
          <ReviewGameArchive
            entries={visibleEntries}
            lang={lang}
            viewerId={user.id}
          />
        ) : (
          <ActivityStream
            entries={visibleEntries}
            lang={lang}
            viewerId={user.id}
          />
        )}
        {canLoadMore && (
          <LoadMoreActivity
            lang={lang}
            viewerId={user.id}
            profileId={user.id}
            section="reviews"
            kind={
              scope === "journey"
                ? "diary"
                : scope === "review" || rating !== "all"
                  ? "review"
                  : undefined
            }
            gameId={game === "all" ? undefined : Number(game)}
            rating={
              scope === "journey" || rating === "all" ? undefined : rating
            }
            spoilers={spoilers}
            order={order}
            query={query || undefined}
            initialCursor={
              entries.length ? entries[entries.length - 1].createdAt : null
            }
            hasMore={entries.length === entryLimit}
            pageSize={60}
          />
        )}
      </div>
    </main>
  );
}
