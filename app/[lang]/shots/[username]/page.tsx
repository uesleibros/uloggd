import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, EyeOff, ImageOff, Images, Layers3 } from "lucide-react";
import { PageLinks } from "@/components/page-links";
import { ShotsWorkspaceControls } from "@/components/social/shots-workspace-controls";
import { WorkspaceHero } from "@/components/social/workspace-hero";
import { getGamesByIds } from "@/lib/igdb";
import { localeAlternates } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale, resolveLocale } from "../../dictionaries";
import "../../profile.css";

type Props = {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    spoilers?: string;
    sort?: string;
    game?: string;
  }>;
};

const PAGE_SIZE = 48;

/** Named rather than free-form, so an unknown value falls back instead of leaking into the query. */
type SpoilerScope = "all" | "safe" | "spoilers";
type Sort = "new" | "old";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username } = await params;
  if (!hasLocale(lang)) return {};
  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) return {};
  const name = profile.display_name || `@${profile.username}`;
  const description = tri(
    lang,
    `As capturas que @${profile.username} publicou no uloggd.`,
    `The screenshots @${profile.username} has published on uloggd.`,
    `Las capturas que @${profile.username} ha publicado en uloggd.`,
  );
  const title = tri(
    lang,
    `Capturas de ${name}`,
    `${name}'s screenshots`,
    `Capturas de ${name}`,
  );
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/shots/${profile.username}`),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "profile",
      siteName: "uloggd",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ScreenshotsGalleryPage({
  params,
  searchParams,
}: Props) {
  const [{ lang: rawLang, username }, requested] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!hasLocale(rawLang)) notFound();
  const lang = resolveLocale(rawLang);
  const supabase = await getSupabase();

  const [{ data: profile }, viewer] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,banner_url")
      .ilike("username", username)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!profile?.username) notFound();

  const query = (requested.q ?? "").trim().slice(0, 60);
  const spoilers: SpoilerScope =
    requested.spoilers === "safe" || requested.spoilers === "spoilers"
      ? requested.spoilers
      : "all";
  const sort: Sort = requested.sort === "old" ? "old" : "new";
  const page = Math.max(1, Number(requested.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Counts for the tabs come from head queries: the numbers are the point of
  // the tabs, and loading rows to count them would double the work.
  const scoped = () =>
    supabase
      .from("screenshots")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id);
  const [{ count: total }, { count: safeCount }, { count: spoilerCount }] =
    await Promise.all([
      scoped(),
      scoped().eq("contains_spoilers", false),
      scoped().eq("contains_spoilers", true),
    ]);

  // The games this person has actually published screenshots from. Loaded
  // separately from the page of results, so the filter still lists every game
  // when a filter is narrowing the page down to one of them.
  const { data: gameRows } = await supabase
    .from("screenshots")
    .select("igdb_id,game_slug")
    .eq("profile_id", profile.id);
  const gameOptions = [
    ...new Map(
      (gameRows ?? []).map((row) => [row.igdb_id, row.game_slug as string]),
    ).entries(),
  ];
  const gameFilter = requested.game?.trim().slice(0, 100) ?? "";

  let rows = supabase
    .from("screenshots")
    .select(
      "id,public_id,igdb_id,game_slug,image_url,description,contains_spoilers,width,height,created_at",
      { count: "exact" },
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: sort === "old" })
    .range(offset, offset + PAGE_SIZE - 1);
  if (spoilers !== "all")
    rows = rows.eq("contains_spoilers", spoilers === "spoilers");
  if (gameFilter) rows = rows.eq("game_slug", gameFilter);
  if (query) {
    // Escaped rather than stripped, so a description containing a percent sign
    // is searchable instead of silently matching everything.
    const safe = query.replace(/[\\%_]/g, (char) => `\\${char}`);
    rows = rows.or(`description.ilike.%${safe}%,game_slug.ilike.%${safe}%`);
  }
  const { data: shots, count: matching } = await rows;

  const list = shots ?? [];
  const games = list.length
    ? await getGamesByIds([...new Set(list.map((shot) => shot.igdb_id))])
    : [];
  const gamesById = new Map(games.map((game) => [game.id, game]));

  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;
  const base = `/${lang}/shots/${profile.username}`;
  const isOwner = viewer?.id === profile.id;

  /** Keeps the other filters when one of them changes. */
  const withParams = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: query, spoilers, sort, game: gameFilter, ...next };
    for (const [key, value] of Object.entries(merged))
      if (value && value !== "all" && value !== "new") params.set(key, value);
    const search = params.toString();
    return search ? `${base}?${search}` : base;
  };

  const scopes = [
    {
      value: "all" as const,
      label: tri(lang, "Tudo", "All", "Todo"),
      icon: <Layers3 size={14} />,
      count: total ?? 0,
    },
    {
      value: "safe" as const,
      label: tri(lang, "Sem spoiler", "Spoiler-free", "Sin spoiler"),
      icon: <Images size={14} />,
      count: safeCount ?? 0,
    },
    {
      value: "spoilers" as const,
      label: tri(lang, "Com spoiler", "Spoilers", "Con spoiler"),
      icon: <EyeOff size={14} />,
      count: spoilerCount ?? 0,
    },
  ];

  return (
    <main className="social-page workspace-layout-page reviews-page">
      <WorkspaceHero
        profile={profile}
        title={tri(
          lang,
          `Capturas de ${name}`,
          `${name}'s screenshots`,
          `Capturas de ${name}`,
        )}
        description={tri(
          lang,
          `A galeria pública de momentos que @${profile.username} guardou.`,
          `The public gallery of moments @${profile.username} kept.`,
          `La galería pública de momentos que @${profile.username} guardó.`,
        )}
        stats={[
          {
            icon: <Images size={14} />,
            label: tri(lang, "Capturas", "Screenshots", "Capturas"),
            value: total ?? 0,
          },
          {
            icon: <EyeOff size={14} />,
            label: tri(lang, "Com spoiler", "Spoilers", "Con spoiler"),
            value: spoilerCount ?? 0,
          },
        ]}
      />
      <div className="workspace-page-body reviews-workspace">
        <Link
          className="page-back-link"
          href={`/${lang}/u/${profile.username}`}
        >
          <ArrowLeft size={15} /> {t.backToProfile}
        </Link>

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
            <Link
              key={scope.value}
              href={withParams({ spoilers: scope.value, page: undefined })}
              aria-current={spoilers === scope.value ? "page" : undefined}
            >
              {scope.icon}
              {scope.label} <span>{scope.count}</span>
            </Link>
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
            <span>{tri(lang, "GALERIA", "GALLERY", "GALERÍA")}</span>
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
              <Link href={base} className="reviews-filter-empty-reset">
                {tri(
                  lang,
                  "Limpar filtros",
                  "Clear filters",
                  "Limpiar filtros",
                )}
              </Link>
            )}
          </section>
        ) : (
          /* The same card the profile gallery uses. Reused rather than
             restyled: two grids of screenshots that look slightly different
             read as two different features. */
          <div className="screenshot-gallery-grid">
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
        />
      </div>
    </main>
  );
}
