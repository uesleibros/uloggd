import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  EyeOff,
  Flag,
  Gamepad2,
  Map,
  Play,
  Star,
  X,
} from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { ActivityEntryActions } from "@/components/social/activity-entry-actions";
import type { SocialEntry } from "@/components/social/activity-stream";
import { JournalGallery } from "@/components/social/journal-gallery";
import { SensitiveCover } from "@/components/social/sensitive-cover";
import { PageLinks } from "@/components/page-links";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { getProfileLevel } from "@/lib/profile-level";
import { getGamesByIds } from "@/lib/igdb";
import { formatEntryTime } from "@/lib/journal-entry";
import { getJournalImages } from "@/lib/journal-images";
import { jsonLd, localeAlternates, SITE_URL } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";

type Props = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
};

const SESSION_PAGE_SIZE = 40;

const publicIdPattern = /^[23456789A-HJ-NP-Za-km-z]{10}$/;
const uuidPattern = /^[0-9a-f-]{36}$/i;
const journeySelect =
  "id,public_id,profile_id,igdb_id,game_slug,title,created_at,updated_at,profiles!journeys_profile_id_fkey(username,display_name,avatar_url,verified)";

function journeyKey(id: string) {
  if (publicIdPattern.test(id)) return ["public_id", id] as const;
  if (uuidPattern.test(id)) return ["id", id] as const;
  return null;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

function formatReviewRating(
  rating: number | null,
  mode: string | null,
  recommended: boolean | null,
  lang: UiLang,
) {
  if (mode === "recommend") {
    if (recommended === null) return null;
    return recommended
      ? tri(lang, "Recomenda", "Recommends", "Recomienda")
      : tri(lang, "Não recomenda", "Doesn't recommend", "No recomienda");
  }
  if (rating === null) return null;
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}

/**
 * Distinct calendar days a set of entries touches.
 *
 * Summing each entry's span would double-count now that a day can hold several
 * entries: three sessions logged on one afternoon are one day played, not
 * three. Ranges still contribute every day they cover.
 */
function distinctPlayedDays(
  entries: Array<{ played_on: string; ended_on: string | null }>,
) {
  const days = new Set<string>();
  for (const entry of entries) {
    const start = Date.parse(`${entry.played_on}T00:00:00Z`);
    const end = entry.ended_on
      ? Date.parse(`${entry.ended_on}T00:00:00Z`)
      : start;
    // Guard against a malformed range standing in for an unbounded loop.
    const span = Math.min(
      Math.max(0, Math.round((end - start) / 86_400_000)),
      3650,
    );
    for (let offset = 0; offset <= span; offset += 1)
      days.add(
        new Date(start + offset * 86_400_000).toISOString().slice(0, 10),
      );
  }
  return days.size;
}

const getJourneyRecord = cache(async (id: string) => {
  const key = journeyKey(id);
  if (!key) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("journeys")
    .select(journeySelect)
    .eq(key[0], key[1])
    .maybeSingle();
  // A database/schema failure is not a missing page. Keeping these states
  // separate prevents an operational issue from being cached and indexed as a
  // real 404 while still letting Next render not-found for unknown IDs.
  if (error)
    throw new Error(`Journal lookup failed (${error.code || "unknown"})`);
  if (!data) return null;
  const { data: suspension, error: suspensionError } = await supabase.rpc(
    "profile_suspension",
    { target: data.profile_id },
  );
  if (suspensionError)
    throw new Error(
      `Journal moderation lookup failed (${suspensionError.code || "unknown"})`,
    );
  return { journey: data, key, suspended: Boolean(suspension?.length) };
});

function journeyDescription(
  lang: UiLang,
  username: string,
  gameName: string,
  sessionCount: number,
) {
  if (!sessionCount)
    return tri(
      lang,
      `Acompanhe a jornada de @${username} em ${gameName}.`,
      `Follow @${username}'s journey through ${gameName}.`,
      `Sigue el recorrido de @${username} en ${gameName}.`,
    );
  return tri(
    lang,
    `${sessionCount} ${sessionCount === 1 ? "sessão pública" : "sessões públicas"} na jornada de @${username} em ${gameName}.`,
    `${sessionCount} public ${sessionCount === 1 ? "session" : "sessions"} in @${username}'s journey through ${gameName}.`,
    `${sessionCount} ${sessionCount === 1 ? "sesión pública" : "sesiones públicas"} en el recorrido de @${username} en ${gameName}.`,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const record = await getJourneyRecord(id);
  if (!record) return {};
  if (record.suspended)
    return {
      title: tri(
        lang,
        "Jornada indisponível",
        "Journey unavailable",
        "Recorrido no disponible",
      ),
      robots: { index: false, follow: false },
    };
  const { journey } = record;
  const profile = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;
  if (!profile?.username) return {};
  const { count: publicSessionCount, error: sessionCountError } = await (
    await getSupabase()
  )
    .from("diary_entries")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", journey.id)
    .eq("visibility", "PUBLIC");
  if (sessionCountError)
    throw new Error(
      `Journal metadata lookup failed (${sessionCountError.code || "unknown"})`,
    );
  const game = (await getGamesByIds([journey.igdb_id]))[0];
  const gameName = game?.name ?? journey.game_slug;
  const title = `${journey.title} · ${gameName}`;
  const description = journeyDescription(
    lang,
    profile.username,
    gameName,
    publicSessionCount ?? 0,
  );
  const image = game?.heroUrl ?? game?.coverUrl;
  return {
    title,
    description,
    authors: [
      {
        name: profile.display_name || `@${profile.username}`,
        url: `/${lang}/u/${profile.username}`,
      },
    ],
    creator: profile.display_name || `@${profile.username}`,
    publisher: "uloggd",
    category: "games",
    keywords: [gameName, journey.title, "uloggd", "game journal"],
    alternates: localeAlternates(lang, `/journal/${journey.public_id}`),
    robots:
      (publicSessionCount ?? 0) > 0
        ? undefined
        : { index: false, follow: true },
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "article",
      siteName: "uloggd",
      locale: tri(lang, "pt_BR", "en_US", "es_ES"),
      publishedTime: journey.created_at,
      modifiedTime: journey.updated_at,
      authors: [`${SITE_URL}/${lang}/u/${profile.username}`],
      images: image ? [{ url: image, alt: gameName }] : undefined,
    },
    twitter: {
      card: game?.heroUrl ? "summary_large_image" : "summary",
      title: `${title} · uloggd`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function JournalPage({ params, searchParams }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !journeyKey(id)) notFound();
  const [record, user] = await Promise.all([
    getJourneyRecord(id),
    getAuthUser(),
  ]);
  if (!record) notFound();
  if (record.suspended) notFound();
  const { journey, key } = record;
  if (key[0] === "id")
    permanentRedirect(`/${lang}/journal/${journey.public_id}`);

  const profile = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;
  if (!profile?.username) notFound();

  const supabase = await getSupabase();
  const standing = await getProfileLevel(supabase, journey.profile_id);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  // Two reads instead of one. The totals, the period and the day numbering all
  // need every entry, but they only need three columns; the timeline needs the
  // whole row plus a gallery per entry, and a long journey now runs to hundreds
  // of entries with up to twelve images each.
  const [games, summaryResult, sessionResult, reviewResult] = await Promise.all(
    [
      getGamesByIds([journey.igdb_id]),
      supabase
        .from("diary_entries")
        .select("played_on,ended_on,minutes,visibility,updated_at")
        .eq("journey_id", journey.id)
        .order("played_on", { ascending: true }),
      supabase
        .from("diary_entries")
        .select(
          "id,public_id,profile_id,played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,created_at,updated_at",
        )
        .eq("journey_id", journey.id)
        .order("played_on", { ascending: true })
        // Within a day, the clock decides; untimed entries fall in behind them.
        .order("started_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .range((page - 1) * SESSION_PAGE_SIZE, page * SESSION_PAGE_SIZE - 1),
      supabase
        .from("reviews")
        .select("public_id,title,rating,rating_mode,recommended,created_at")
        .eq("journey_id", journey.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ],
  );
  if (summaryResult.error)
    throw new Error(
      `Journal summary failed (${summaryResult.error.code || "unknown"})`,
    );
  if (sessionResult.error)
    throw new Error(
      `Journal sessions failed (${sessionResult.error.code || "unknown"})`,
    );
  if (reviewResult.error)
    throw new Error(
      `Journal reviews failed (${reviewResult.error.code || "unknown"})`,
    );
  const reviews = reviewResult.data;
  const game = games[0] ?? null;
  // Every entry, three columns: what the header and the day numbering need.
  const allSessions = summaryResult.data ?? [];
  // One page of full rows: what the timeline renders.
  const visibleSessions = sessionResult.data ?? [];
  const imagesByEntry = await getJournalImages(
    supabase,
    visibleSessions.map((session) => session.id),
  );
  const publicSessions = allSessions.filter(
    (session) => session.visibility === "PUBLIC",
  );
  const totalMinutes = allSessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const totalDays = distinctPlayedDays(allSessions);
  const sessionTotal = allSessions.length;
  const pageCount = Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE));
  const journeyPageHref = (next: number) =>
    next === 1
      ? `/${lang}/journal/${journey.public_id}`
      : `/${lang}/journal/${journey.public_id}?page=${next}`;
  const firstSession = allSessions[0] ?? null;
  const lastSession = allSessions.at(-1) ?? null;
  // Numbered across the whole journey, not the page: day 3 must stay day 3 on
  // page two. A plain record, not a Map, because `Map` is the lucide icon here.
  const dayNumbers: Record<string, number> = {};
  for (const session of allSessions)
    if (!(session.played_on in dayNumbers))
      dayNumbers[session.played_on] = Object.keys(dayNumbers).length + 1;
  const isOwner = user?.id === journey.profile_id;
  const t = uiText(lang);
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const routeDate = new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  const gameName = game?.name ?? journey.game_slug;
  const canonicalUrl = `${SITE_URL}/${lang}/journal/${journey.public_id}`;
  const publicUpdatedAt = publicSessions.reduce(
    (latest, session) =>
      Date.parse(session.updated_at) > Date.parse(latest)
        ? session.updated_at
        : latest,
    journey.updated_at,
  );
  const structuredDescription = journeyDescription(
    lang,
    profile.username,
    gameName,
    publicSessions.length,
  );

  return (
    <main className="social-page journal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${canonicalUrl}#journal`,
              url: canonicalUrl,
              headline: journey.title,
              description: structuredDescription,
              inLanguage: lang,
              datePublished: journey.created_at,
              dateModified: publicUpdatedAt,
              ...(game
                ? { image: [game.heroUrl ?? game.coverUrl].filter(Boolean) }
                : {}),
              author: {
                "@type": "Person",
                name: profile.display_name || `@${profile.username}`,
                url: `${SITE_URL}/${lang}/u/${profile.username}`,
              },
              publisher: {
                "@type": "Organization",
                name: "uloggd",
                url: SITE_URL,
              },
              mainEntityOfPage: canonicalUrl,
              about: {
                "@type": "VideoGame",
                name: gameName,
                url: `${SITE_URL}/${lang}/game/${journey.game_slug}`,
              },
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: tri(lang, "Início", "Home", "Inicio"),
                  item: `${SITE_URL}/${lang}`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: gameName,
                  item: `${SITE_URL}/${lang}/game/${journey.game_slug}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: journey.title,
                  item: canonicalUrl,
                },
              ],
            },
          ],
        })}
      />
      <Link
        className="page-back-link"
        href={`/${lang}/game/${journey.game_slug}`}
      >
        <ArrowLeft size={14} />
        {tri(lang, "Voltar ao jogo", "Back to game", "Volver al juego")}
      </Link>

      <article className="journal-page-card">
        <header className="journal-page-hero">
          <Link
            className="journal-page-cover"
            href={`/${lang}/game/${journey.game_slug}`}
          >
            {game?.coverUrl && (
              <Image src={game.coverUrl} alt="" fill sizes="112px" priority />
            )}
          </Link>
          <div className="journal-page-heading">
            <span className="journal-page-eyebrow">
              <Map size={12} />
              {tri(lang, "JORNADA", "JOURNEY", "RECORRIDO")}
            </span>
            <h1>{journey.title}</h1>
            <Link
              className="journal-page-game"
              href={`/${lang}/game/${journey.game_slug}`}
            >
              {game?.name ?? journey.game_slug}
              <ArrowRight size={13} />
            </Link>
            <div className="review-page-byline">
              <Link
                className="review-page-avatar"
                href={`/${lang}/u/${profile.username}`}
              >
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    fill
                    sizes="28px"
                    unoptimized
                  />
                ) : (
                  profile.username.slice(0, 1).toUpperCase()
                )}
              </Link>
              <Link href={`/${lang}/u/${profile.username}`}>
                <strong>
                  {profile.display_name || `@${profile.username}`}
                </strong>
              </Link>
              {standing && (
                <ProfileLevelBadge lang={lang} standing={standing} />
              )}
              {profile.verified && <VerifiedBadge lang={lang} />}
            </div>
          </div>
          {isOwner && (
            /* Straight to the game page's log form with this journey already
               chosen. Adding a session was only reachable from the game, which
               meant leaving the journey to continue it: the one thing someone
               reading their own journey most wants to do. */
            <Link
              className="journal-page-log"
              href={`/${lang}/game/${journey.game_slug}?session=1&journey=${journey.id}`}
            >
              <Plus size={15} />
              {tri(
                lang,
                "Registrar sessão",
                "Log a session",
                "Registrar sesión",
              )}
            </Link>
          )}
          <ShareButton
            className="content-share-action journal-page-share"
            title={`${journey.title} · ${game?.name ?? journey.game_slug}`}
            text={tri(
              lang,
              `Jornada de ${game?.name ?? journey.game_slug} por @${profile.username}`,
              `${game?.name ?? journey.game_slug} journey by @${profile.username}`,
              `Recorrido de ${game?.name ?? journey.game_slug} por @${profile.username}`,
            )}
            label={t.share}
            copiedLabel={t.linkCopied}
            lang={lang}
          />
        </header>

        <dl className="journal-page-stats">
          <div>
            <dt>
              <CalendarDays size={13} />
              {tri(lang, "Sessões", "Sessions", "Sesiones")}
            </dt>
            <dd>{visibleSessions.length}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={13} />
              {tri(lang, "Dias", "Days", "Días")}
            </dt>
            <dd>{totalDays || "-"}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={13} />
              {tri(lang, "Tempo", "Time", "Tiempo")}
            </dt>
            <dd>{totalMinutes ? formatMinutes(totalMinutes) : "-"}</dd>
          </div>
          <div>
            <dt>
              <Flag size={13} />
              {tri(lang, "Período", "Period", "Período")}
            </dt>
            <dd>
              {firstSession && lastSession
                ? `${date.format(new Date(`${firstSession.played_on}T00:00:00Z`))} – ${date.format(new Date(`${lastSession.ended_on ?? lastSession.played_on}T00:00:00Z`))}`
                : "-"}
            </dd>
          </div>
        </dl>

        <div
          className="journal-page-layout"
          data-has-rail={
            visibleSessions.length > 0 || (reviews ?? []).length > 0
              ? ""
              : undefined
          }
        >
          <section className="journal-page-timeline">
            <header>
              <div>
                <span>
                  {tri(lang, "LINHA DO TEMPO", "TIMELINE", "CRONOLOGÍA")}
                </span>
                <h2>
                  {tri(
                    lang,
                    "O caminho desta jornada",
                    "This journey's path",
                    "El camino de este recorrido",
                  )}
                </h2>
              </div>
              <Gamepad2 size={18} />
            </header>

            {visibleSessions.length ? (
              <div className="journal-timeline-list">
                {visibleSessions.map((session, index) => {
                  // A day can hold several entries, so the timeline numbers
                  // days rather than rows: repeating the same date down three
                  // consecutive cards read as duplicated sessions.
                  const previous = visibleSessions[index - 1];
                  // The first row of a page has no predecessor here, so a day
                  // split across the page boundary would restate its date and
                  // its number. The whole-journey day map settles it: if the
                  // page starts mid-day, that row continues one.
                  const continuesDay = previous
                    ? previous.played_on === session.played_on
                    : page > 1 &&
                      allSessions[(page - 1) * SESSION_PAGE_SIZE - 1]
                        ?.played_on === session.played_on;
                  const activityEntry: SocialEntry = {
                    id: session.id,
                    publicId: session.public_id,
                    kind: "diary",
                    profileId: session.profile_id,
                    profile,
                    igdbId: journey.igdb_id,
                    gameSlug: journey.game_slug,
                    game,
                    playedOn: session.played_on,
                    endedOn: session.ended_on,
                    startedAt: session.started_at,
                    minutes: session.minutes,
                    content: session.note,
                    marksStart: session.marks_start,
                    marksFinish: session.marks_finish,
                    journeyId: journey.id,
                    journeyTitle: journey.title,
                    journeyPublicId: journey.public_id,
                    spoilers: session.contains_spoilers,
                    visibility: session.visibility,
                    commentsScope: session.comments_scope,
                    createdAt: session.created_at,
                    updatedAt: session.updated_at,
                  };
                  return (
                    <article
                      className="journal-session"
                      data-continues-day={continuesDay || undefined}
                      id={`session-${session.public_id}`}
                      key={session.id}
                    >
                      <span className="journal-session-node" aria-hidden>
                        {continuesDay ? "" : dayNumbers[session.played_on]}
                      </span>
                      <div>
                        <header>
                          {continuesDay ? (
                            <span className="journal-session-same-day">
                              {tri(
                                lang,
                                "No mesmo dia",
                                "Same day",
                                "El mismo día",
                              )}
                            </span>
                          ) : (
                            <time dateTime={session.played_on}>
                              {date.format(
                                new Date(`${session.played_on}T00:00:00Z`),
                              )}
                              {session.ended_on
                                ? ` – ${date.format(new Date(`${session.ended_on}T00:00:00Z`))}`
                                : ""}
                            </time>
                          )}
                          {session.started_at && (
                            <span>
                              <Clock3 size={12} />
                              {formatEntryTime(session.started_at, lang)}
                            </span>
                          )}
                          {session.minutes ? (
                            <span>
                              <Clock3 size={12} />
                              {formatMinutes(session.minutes)}
                            </span>
                          ) : null}
                        </header>
                        {(session.marks_start || session.marks_finish) && (
                          <div className="journal-session-milestones">
                            {session.marks_start && (
                              <span data-milestone="start">
                                <Play size={11} fill="currentColor" />
                                {tri(lang, "Início", "Start", "Inicio")}
                              </span>
                            )}
                            {session.marks_finish && (
                              <span data-milestone="finish">
                                <Flag size={11} fill="currentColor" />
                                {tri(lang, "Fim", "Finish", "Fin")}
                              </span>
                            )}
                          </div>
                        )}
                        {session.note &&
                          (session.contains_spoilers ? (
                            <details className="spoiler-content journal-session-note">
                              <summary>
                                <EyeOff size={13} />
                                {tri(
                                  lang,
                                  "Mostrar anotação com spoilers",
                                  "Show spoiler note",
                                  "Mostrar nota con spoilers",
                                )}
                              </summary>
                              <MarkdownContent
                                content={session.note}
                                lang={lang}
                                variant="review"
                              />
                            </details>
                          ) : (
                            <div className="journal-session-note">
                              <MarkdownContent
                                content={session.note}
                                lang={lang}
                                variant="review"
                              />
                            </div>
                          ))}
                        <SensitiveCover
                          sensitive={Boolean(session.sensitive)}
                          lang={lang}
                        >
                          <JournalGallery
                            images={imagesByEntry.get(session.id) ?? []}
                            lang={lang}
                            spoilers={session.contains_spoilers}
                            className="journal-session-gallery"
                          />
                        </SensitiveCover>
                        <footer>
                          <Link href={`/${lang}/entry/${session.public_id}`}>
                            {tri(
                              lang,
                              "Abrir sessão",
                              "Open session",
                              "Abrir sesión",
                            )}
                            <ArrowRight size={13} />
                          </Link>
                          {isOwner && (
                            <ActivityEntryActions
                              entry={activityEntry}
                              lang={lang}
                            />
                          )}
                        </footer>
                      </div>
                    </article>
                  );
                })}
                <PageLinks
                  page={page}
                  pageCount={pageCount}
                  hrefFor={journeyPageHref}
                  lang={lang}
                  label={tri(
                    lang,
                    "Páginas da jornada",
                    "Journey pages",
                    "Páginas del recorrido",
                  )}
                  className="journal-timeline-pages"
                />
              </div>
            ) : (
              <div className="journal-page-empty">
                <Map size={24} />
                <strong>
                  {tri(
                    lang,
                    "Nenhuma sessão visível",
                    "No visible sessions",
                    "No hay sesiones visibles",
                  )}
                </strong>
                <p>
                  {tri(
                    lang,
                    "As sessões públicas desta jornada aparecerão aqui.",
                    "Public sessions from this journey will appear here.",
                    "Las sesiones públicas de este recorrido aparecerán aquí.",
                  )}
                </p>
              </div>
            )}
          </section>

          {(visibleSessions.length > 0 || (reviews ?? []).length > 0) && (
            <aside className="journal-page-rail">
              {visibleSessions.length > 0 && (
                <nav
                  className="journal-route-map"
                  aria-label={tri(
                    lang,
                    "Mapa da jornada",
                    "Journey map",
                    "Mapa del recorrido",
                  )}
                >
                  <header>
                    <span>{tri(lang, "PERCURSO", "ROUTE", "RECORRIDO")}</span>
                    <strong>
                      {tri(
                        lang,
                        "Navegue pelas sessões",
                        "Jump between sessions",
                        "Navega por las sesiones",
                      )}
                    </strong>
                  </header>
                  <div>
                    {visibleSessions.map((session, index) => (
                      <a
                        href={`#session-${session.public_id}`}
                        key={session.public_id}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>
                            {routeDate.format(
                              new Date(`${session.played_on}T00:00:00Z`),
                            )}
                          </strong>
                          <small>
                            {session.marks_start
                              ? tri(lang, "Início", "Start", "Inicio")
                              : session.marks_finish
                                ? tri(lang, "Fim", "Finish", "Fin")
                                : session.minutes
                                  ? formatMinutes(session.minutes)
                                  : tri(lang, "Sessão", "Session", "Sesión")}
                          </small>
                        </div>
                        <ArrowRight size={12} />
                      </a>
                    ))}
                  </div>
                </nav>
              )}

              {(reviews ?? []).length > 0 && (
                <section className="journal-page-reviews">
                  <span>
                    {tri(
                      lang,
                      "AVALIAÇÕES VINCULADAS",
                      "LINKED REVIEWS",
                      "RESEÑAS VINCULADAS",
                    )}
                  </span>
                  <div>
                    {(reviews ?? []).map((review) => {
                      const score = formatReviewRating(
                        review.rating,
                        review.rating_mode,
                        review.recommended,
                        lang,
                      );
                      return (
                        <Link
                          href={`/${lang}/review/${review.public_id}`}
                          key={review.public_id}
                        >
                          <div>
                            <strong>
                              {review.title ||
                                tri(
                                  lang,
                                  "Avaliação da jornada",
                                  "Journey review",
                                  "Reseña del recorrido",
                                )}
                            </strong>
                            <small>
                              {date.format(new Date(review.created_at))}
                            </small>
                          </div>
                          {score && (
                            <span>
                              {review.rating_mode === "recommend" ? (
                                review.recommended ? (
                                  <Check size={12} />
                                ) : (
                                  <X size={12} />
                                )
                              ) : (
                                <Star size={12} fill="currentColor" />
                              )}
                              {score}
                            </span>
                          )}
                          <ArrowRight size={14} />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </aside>
          )}
        </div>
      </article>
    </main>
  );
}
