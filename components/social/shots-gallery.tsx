"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  EyeOff,
  Images,
  Layers3,
  MessageCircle,
  Heart,
  ImageOff,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { PageLinks } from "@/components/page-links";
import { ShallowLink } from "@/components/shallow-link";
import { LoadError } from "@/components/ui/load-error";
import { ShotsWorkspaceControls } from "@/components/social/shots-workspace-controls";
import { ShotsBodySkeleton } from "@/components/social/workspace-body-skeletons";
import type { ScreenshotGallery } from "@/lib/screenshot-types";
import type { Game } from "@/lib/igdb";
import { tri, type UiLang } from "@/lib/ui-text";

/** Matches the page size the route answers with. */
const PAGE_SIZE = 48;

type SpoilerScope = "all" | "safe" | "spoilers";
type Sort = "new" | "old";

/**
 * Somebody's screenshots, read by the browser.
 *
 * The page used to read the gallery on the server, then hydrate every game in
 * it from IGDB, and only then answer: the route's skeleton sat there for both,
 * and every filter was a round trip for a page that is otherwise identical. The
 * hero above this is known from the profile alone and goes out first.
 *
 * The filters stay in the URL, because a filtered gallery is worth sharing and
 * worth landing on. `games=1` brings the catalogue entries with the rows, so
 * one read draws the grid rather than two that cannot overlap.
 */
export function ShotsGallery({
  username,
  lang,
  base,
  isOwner,
}: {
  username: string;
  lang: UiLang;
  /** Where the filters point, which is this page. */
  base: string;
  isOwner: boolean;
}) {
  const params = useSearchParams();

  const query = (params.get("q") ?? "").trim().slice(0, 60);
  const spoilers: SpoilerScope =
    params.get("spoilers") === "safe" || params.get("spoilers") === "spoilers"
      ? (params.get("spoilers") as SpoilerScope)
      : "all";
  const sort: Sort = params.get("sort") === "old" ? "old" : "new";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const gameFilter = params.get("game")?.trim().slice(0, 100) ?? "";

  const filters = new URLSearchParams({
    q: query,
    spoilers,
    sort,
    page: String(page),
    game: gameFilter,
    games: "1",
  });
  const gallery = useApi<ScreenshotGallery & { catalog: Game[] }>(
    `/profiles/${encodeURIComponent(username)}/screenshots?${filters}`,
    { keepPrevious: true },
  );

  const list = gallery.payload?.data ?? [];
  const total = gallery.payload?.total ?? 0;
  const safeCount = gallery.payload?.safe_count ?? 0;
  const spoilerCount = gallery.payload?.spoiler_count ?? 0;
  const matching = gallery.payload?.matching ?? 0;
  const gameOptions = (gallery.payload?.games ?? []).map(
    (game) => [game.igdb_id, game.game_slug] as const,
  );
  const gamesById = new Map(
    (gallery.payload?.catalog ?? []).map((game) => [game.id, game]),
  );
  const likesById = new Map(
    (
      (gallery.payload?.likes ?? []) as {
        content_id: string;
        like_count: number;
      }[]
    ).map((row) => [row.content_id, Number(row.like_count)]),
  );
  const commentsById = new Map(
    (
      (gallery.payload?.comments ?? []) as {
        content_id: string;
        comment_count: number;
      }[]
    ).map((row) => [row.content_id, Number(row.comment_count)]),
  );

  /** Keeps the other filters when one of them changes. */
  const withParams = (next: Record<string, string | undefined>) => {
    const carried = new URLSearchParams();
    const merged = { q: query, spoilers, sort, game: gameFilter, ...next };
    for (const [key, value] of Object.entries(merged))
      if (value && value !== "all" && value !== "new") carried.set(key, value);
    const search = carried.toString();
    return search ? `${base}?${search}` : base;
  };

  const scopes = [
    {
      value: "all" as const,
      label: tri(lang, "Tudo", "All", "Todo"),
      icon: <Layers3 size={14} />,
      count: total,
    },
    {
      value: "safe" as const,
      label: tri(lang, "Sem spoiler", "Spoiler-free", "Sin spoiler"),
      icon: <Images size={14} />,
      count: safeCount,
    },
    {
      value: "spoilers" as const,
      label: tri(lang, "Com spoiler", "Spoilers", "Con spoiler"),
      icon: <EyeOff size={14} />,
      count: spoilerCount,
    },
  ];

  // The same drawing the route's skeleton used, tabs and heading included, so
  // the hero arriving does not swap one placeholder for another.
  if (gallery.loading && !gallery.payload) return <ShotsBodySkeleton />;
  // Failed is not empty: this used to fall through to "no screenshots yet".
  if (gallery.error && !gallery.payload)
    return (
      <LoadError
        lang={lang}
        onRetry={gallery.reload}
        what={tri(lang, "as capturas", "the screenshots", "las capturas")}
      />
    );

  return (
    <>
      <nav
        className="game-page-nav reviews-scope-tabs"
        aria-label={tri(
          lang,
          "Filtrar capturas",
          "Filter screenshots",
          "Filtrar capturas",
        )}
      >
        {scopes.map((scope) => (
          <ShallowLink
            key={scope.value}
            href={withParams({ spoilers: scope.value, page: undefined })}
            aria-current={spoilers === scope.value ? "page" : undefined}
          >
            {scope.icon}
            {scope.label} <span>{scope.count}</span>
          </ShallowLink>
        ))}
      </nav>

      <ShotsWorkspaceControls
        key={query}
        lang={lang}
        state={{ game: gameFilter || "all", spoilers, order: sort, query }}
        games={[
          { value: "all", label: tri(lang, "Todos", "All", "Todos") },
          ...gameOptions.map(([id, slug]) => ({
            value: slug,
            label: gamesById.get(id)?.name ?? slug,
          })),
        ]}
      />

      <header className="reviews-results-heading">
        <div>
          <h2>
            {tri(
              lang,
              `${matching ?? 0} ${matching === 1 ? "captura encontrada" : "capturas encontradas"}`,
              `${matching ?? 0} ${matching === 1 ? "screenshot found" : "screenshots found"}`,
              `${matching ?? 0} ${matching === 1 ? "captura encontrada" : "capturas encontradas"}`,
            )}
          </h2>
        </div>
        <p>
          {tri(
            lang,
            "Cada captura abre em sua própria página, com o jogo, a descrição e os comentários.",
            "Each screenshot opens on its own page, with the game, the description and the comments.",
            "Cada captura se abre en su propia página, con el juego, la descripción y los comentarios.",
          )}
        </p>
      </header>

      {list.length === 0 ? (
        <section className="reviews-filter-empty">
          <span aria-hidden>
            <Images size={20} />
          </span>
          <h2>
            {query || spoilers !== "all" || gameFilter
              ? tri(
                  lang,
                  "Nada com esse filtro",
                  "Nothing with this filter",
                  "Nada con este filtro",
                )
              : tri(
                  lang,
                  "Nenhuma captura ainda",
                  "No screenshots yet",
                  "Aún no hay capturas",
                )}
          </h2>
          <p>
            {query || spoilers !== "all" || gameFilter
              ? tri(
                  lang,
                  "Nenhuma captura corresponde a esse filtro.",
                  "No screenshot matches this filter.",
                  "Ninguna captura coincide con este filtro.",
                )
              : isOwner
                ? tri(
                    lang,
                    "Você ainda não publicou capturas. Elas aparecem aqui assim que a primeira for enviada.",
                    "You have not published any screenshots yet. They appear here as soon as the first one is uploaded.",
                    "Aún no has publicado capturas. Aparecerán aquí en cuanto subas la primera.",
                  )
                : tri(
                    lang,
                    "Esta pessoa ainda não publicou capturas.",
                    "This person has not published any screenshots yet.",
                    "Esta persona aún no ha publicado capturas.",
                  )}
          </p>
          {(query || spoilers !== "all" || gameFilter) && (
            <ShallowLink href={base} className="reviews-filter-empty-reset">
              {tri(lang, "Limpar filtros", "Clear filters", "Limpiar filtros")}
            </ShallowLink>
          )}
        </section>
      ) : (
        /* The same card the profile gallery uses. Reused rather than
             restyled: two grids of screenshots that look slightly different
             read as two different features. */
        <div
          className="screenshot-gallery-grid"
          // The previous filter's shots stay while the new ones load, dimmed,
          // rather than a skeleton flashing in between every click.
          data-stale={gallery.stale || undefined}
        >
          {list.map((shot) => {
            const url = shot.image_url;
            const game = gamesById.get(shot.igdb_id);
            // A row whose image cannot be resolved is shown as unavailable
            // rather than skipped. Dropping it silently makes the counts
            // above disagree with the grid, which reads as the page being
            // broken instead of the image being gone.
            if (!url)
              return (
                <div
                  key={shot.id}
                  className="screenshot-gallery-card screenshot-gallery-card-missing"
                >
                  <span className="screenshot-gallery-media">
                    <i>
                      <ImageOff size={16} />{" "}
                      {tri(
                        lang,
                        "Imagem indisponível",
                        "Image unavailable",
                        "Imagen no disponible",
                      )}
                    </i>
                  </span>
                  <strong>{game?.name ?? shot.game_slug}</strong>
                  {shot.description && <small>{shot.description}</small>}
                </div>
              );
            return (
              <Link
                href={`/${lang}/shot/${shot.public_id}`}
                key={shot.id}
                className="screenshot-gallery-card"
              >
                <span className="screenshot-gallery-media">
                  <Image
                    src={url}
                    alt={shot.description || game?.name || shot.game_slug}
                    width={shot.width || 640}
                    height={shot.height || 360}
                    sizes="(max-width: 620px) 50vw, (max-width: 1100px) 33vw, 280px"
                    unoptimized
                  />
                  {shot.contains_spoilers && (
                    <i>
                      <EyeOff size={16} />{" "}
                      {tri(lang, "Spoiler", "Spoiler", "Spoiler")}
                    </i>
                  )}
                </span>
                <strong>{game?.name ?? shot.game_slug}</strong>
                {shot.description && <small>{shot.description}</small>}
                {/* Text, not links: the whole card is already a link to the
                      page both of these live on. */}
                <span className="screenshot-gallery-meta">
                  <span>
                    <Heart
                      size={11}
                      fill={
                        (likesById.get(shot.id) ?? 0) > 0
                          ? "currentColor"
                          : "none"
                      }
                    />
                    {(likesById.get(shot.id) ?? 0).toLocaleString(lang)}
                  </span>
                  <span>
                    <MessageCircle size={11} />
                    {(commentsById.get(shot.id) ?? 0).toLocaleString(lang)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <PageLinks
        lang={lang}
        page={page}
        pageCount={Math.max(1, Math.ceil((matching ?? 0) / PAGE_SIZE))}
        label={tri(
          lang,
          "Páginas de capturas",
          "Screenshot pages",
          "Páginas de capturas",
        )}
        hrefFor={(next) =>
          withParams({ page: next > 1 ? String(next) : undefined })
        }
        shallow
      />
    </>
  );
}
