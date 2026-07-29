import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  EyeOff,
  Flag,
  Gamepad2,
  Map,
  Play,
  Star,
} from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { ActivityEntryActions } from "@/components/social/activity-entry-actions";
import type { SocialEntry } from "@/components/social/activity-stream";
import { MentionText } from "@/components/social/mention-text";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { getGamesByIds } from "@/lib/igdb";
import { localeAlternates } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";

type Props = { params: Promise<{ lang: string; id: string }> };

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

function sessionDays(start: string, end: string | null) {
  if (!end) return 1;
  return Math.max(
    1,
    Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const key = journeyKey(id);
  if (!hasLocale(lang) || !key) return {};
  const { data: journey } = await (
    await getSupabase()
  )
    .from("journeys")
    .select(
      "public_id,igdb_id,game_slug,title,profiles!journeys_profile_id_fkey(username)",
    )
    .eq(key[0], key[1])
    .maybeSingle();
  if (!journey) return {};
  const profile = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;
  const game = (await getGamesByIds([journey.igdb_id]))[0];
  const gameName = game?.name ?? journey.game_slug;
  const title = `${journey.title} · ${gameName}`;
  const description = tri(
    lang,
    `Acompanhe a jornada de @${profile?.username} em ${gameName}.`,
    `Follow @${profile?.username}'s journey through ${gameName}.`,
    `Sigue el recorrido de @${profile?.username} en ${gameName}.`,
  );
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/journal/${journey.public_id}`),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "article",
      siteName: "uloggd",
      images: game?.coverUrl
        ? [{ url: game.coverUrl, alt: gameName }]
        : undefined,
    },
    twitter: {
      card: game?.coverUrl ? "summary_large_image" : "summary",
      title: `${title} · uloggd`,
      description,
      images: game?.coverUrl ? [game.coverUrl] : undefined,
    },
  };
}

export default async function JournalPage({ params }: Props) {
  const { lang, id } = await params;
  const key = journeyKey(id);
  if (!hasLocale(lang) || !key) notFound();
  const supabase = await getSupabase();
  const [{ data: journey }, user] = await Promise.all([
    supabase
      .from("journeys")
      .select(journeySelect)
      .eq(key[0], key[1])
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!journey) notFound();
  if (key[0] === "id")
    permanentRedirect(`/${lang}/journal/${journey.public_id}`);

  const profile = Array.isArray(journey.profiles)
    ? journey.profiles[0]
    : journey.profiles;
  if (!profile?.username) notFound();

  const [games, { data: sessions }, { data: reviews }] = await Promise.all([
    getGamesByIds([journey.igdb_id]),
    supabase
      .from("diary_entries")
      .select(
        "id,public_id,profile_id,played_on,ended_on,minutes,note,marks_start,marks_finish,contains_spoilers,visibility,comments_scope,created_at,updated_at",
      )
      .eq("journey_id", journey.id)
      .order("played_on", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("reviews")
      .select("public_id,title,rating,created_at")
      .eq("journey_id", journey.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const game = games[0] ?? null;
  const visibleSessions = sessions ?? [];
  const totalMinutes = visibleSessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const totalDays = visibleSessions.reduce(
    (total, session) =>
      total + sessionDays(session.played_on, session.ended_on),
    0,
  );
  const firstSession = visibleSessions[0] ?? null;
  const lastSession = visibleSessions.at(-1) ?? null;
  const isOwner = user?.id === journey.profile_id;
  const t = uiText(lang);
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="social-page journal-page">
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
              {profile.verified && <VerifiedBadge lang={lang} />}
            </div>
          </div>
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
            <dd>{totalDays || "—"}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={13} />
              {tri(lang, "Tempo", "Time", "Tiempo")}
            </dt>
            <dd>{totalMinutes ? formatMinutes(totalMinutes) : "—"}</dd>
          </div>
          <div>
            <dt>
              <Flag size={13} />
              {tri(lang, "Período", "Period", "Período")}
            </dt>
            <dd>
              {firstSession && lastSession
                ? `${date.format(new Date(`${firstSession.played_on}T00:00:00Z`))} – ${date.format(new Date(`${lastSession.ended_on ?? lastSession.played_on}T00:00:00Z`))}`
                : "—"}
            </dd>
          </div>
        </dl>

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
                  <article className="journal-session" key={session.id}>
                    <span className="journal-session-node" aria-hidden>
                      {index + 1}
                    </span>
                    <div>
                      <header>
                        <time dateTime={session.played_on}>
                          {date.format(
                            new Date(`${session.played_on}T00:00:00Z`),
                          )}
                          {session.ended_on
                            ? ` – ${date.format(new Date(`${session.ended_on}T00:00:00Z`))}`
                            : ""}
                        </time>
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
                            <p>
                              <MentionText text={session.note} lang={lang} />
                            </p>
                          </details>
                        ) : (
                          <p className="journal-session-note">
                            <MentionText text={session.note} lang={lang} />
                          </p>
                        ))}
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
              {(reviews ?? []).map((review) => (
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
                    <small>{date.format(new Date(review.created_at))}</small>
                  </div>
                  {typeof review.rating === "number" && (
                    <span>
                      <Star size={12} fill="currentColor" />
                      {(review.rating / 20).toLocaleString(lang, {
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  )}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
