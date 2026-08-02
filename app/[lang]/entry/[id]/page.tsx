import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  EyeOff,
  Flag,
  Gamepad2,
  Map,
  Play,
} from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { ActivityEntryActions } from "@/components/social/activity-entry-actions";
import type { SocialEntry } from "@/components/social/activity-stream";
import { ContentComments } from "@/components/social/content-comments";
import { RelativeTime } from "@/components/relative-time";
import { LikeButton } from "@/components/social/like-button";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { getProfileLevel } from "@/lib/profile-level";
import { JournalGallery } from "@/components/social/journal-gallery";
import { SensitiveCover } from "@/components/social/sensitive-cover";
import { getGamesByIds } from "@/lib/igdb";
import { formatEntryTime } from "@/lib/journal-entry";
import { getJournalImages } from "@/lib/journal-images";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";
import { localeAlternates } from "@/lib/seo";
import { contentKey } from "@/lib/public-id";

type Props = { params: Promise<{ lang: string; id: string }> };

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const key = contentKey(id);
  if (!hasLocale(lang) || !key) return {};
  const { data: entry } = await (
    await getSupabase()
  )
    .from("diary_entries")
    .select(
      "public_id,igdb_id,game_slug,note,contains_spoilers,played_on,profiles!diary_entries_profile_id_fkey(username)",
    )
    .eq(key[0], key[1])
    .maybeSingle();
  if (!entry) return {};
  const profile = Array.isArray(entry.profiles)
    ? entry.profiles[0]
    : entry.profiles;
  const game = (await getGamesByIds([entry.igdb_id]))[0];
  const gameName = game?.name ?? entry.game_slug;
  const title = tri(
    lang,
    `${gameName} no diário de @${profile?.username}`,
    `${gameName} in @${profile?.username}'s journal`,
    `${gameName} en el diario de @${profile?.username}`,
  );
  const description = entry.contains_spoilers
    ? tri(
        lang,
        `Registro com spoilers de ${gameName}.`,
        `A journal entry with spoilers for ${gameName}.`,
        `Una entrada con spoilers de ${gameName}.`,
      )
    : entry.note?.slice(0, 160) ||
      tri(
        lang,
        `Sessão de ${gameName} registrada no uloggd.`,
        `A ${gameName} play session logged on uloggd.`,
        `Una sesión de ${gameName} registrada en uloggd.`,
      );
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/entry/${entry.public_id}`),
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

export default async function DiaryEntryPage({ params }: Props) {
  const { lang, id } = await params;
  const key = contentKey(id);
  if (!hasLocale(lang) || !key) notFound();
  const supabase = await getSupabase();
  const [{ data: entry }, user] = await Promise.all([
    supabase
      .from("diary_entries")
      .select(
        "id,public_id,profile_id,igdb_id,game_slug,played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,created_at,updated_at,journey_id,journeys!diary_entries_journey_id_fkey(title,public_id),profiles!diary_entries_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope)",
      )
      .eq(key[0], key[1])
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!entry) notFound();
  if (key[0] === "id") permanentRedirect(`/${lang}/entry/${entry.public_id}`);
  const profile = Array.isArray(entry.profiles)
    ? entry.profiles[0]
    : entry.profiles;
  const standing = await getProfileLevel(supabase, entry.profile_id);
  if (!profile) notFound();
  const [games, { data: likes }, { data: follow }, imagesByEntry] =
    await Promise.all([
      getGamesByIds([entry.igdb_id]),
      supabase.rpc("get_content_likes", {
        target_type: "diary",
        target_ids: [entry.id],
      }),
      user && user.id !== entry.profile_id
        ? supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", entry.profile_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getJournalImages(supabase, [entry.id]),
    ]);
  const images = imagesByEntry.get(entry.id) ?? [];
  const game = games[0];
  const journey = Array.isArray(entry.journeys)
    ? entry.journeys[0]
    : entry.journeys;
  const like = likes?.[0] as
    { like_count: number; liked_by_viewer: boolean } | undefined;
  const t = uiText(lang);
  const isOwner = user?.id === entry.profile_id;
  const playedDate = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const canComment =
    Boolean(user) &&
    (user?.id === entry.profile_id ||
      ((profile.content_comment_scope === "EVERYONE" ||
        (profile.content_comment_scope === "FOLLOWERS" && Boolean(follow))) &&
        (entry.comments_scope === "EVERYONE" ||
          (entry.comments_scope === "FOLLOWERS" && Boolean(follow)))));
  const activityEntry: SocialEntry = {
    id: entry.id,
    publicId: entry.public_id,
    kind: "diary",
    profileId: entry.profile_id,
    profile,
    igdbId: entry.igdb_id,
    gameSlug: entry.game_slug,
    game: game ?? null,
    playedOn: entry.played_on,
    endedOn: entry.ended_on,
    startedAt: entry.started_at,
    minutes: entry.minutes,
    content: entry.note,
    marksStart: entry.marks_start,
    marksFinish: entry.marks_finish,
    journeyId: entry.journey_id,
    journeyTitle: journey?.title ?? null,
    journeyPublicId: journey?.public_id ?? null,
    spoilers: entry.contains_spoilers,
    visibility: entry.visibility,
    commentsScope: entry.comments_scope,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
  return (
    <main className="social-page diary-entry-page">
      <Link
        className="page-back-link"
        href={
          journey?.public_id
            ? `/${lang}/journal/${journey.public_id}`
            : `/${lang}/game/${entry.game_slug}`
        }
      >
        <ArrowLeft size={14} />
        {journey?.public_id
          ? tri(
              lang,
              "Voltar à jornada",
              "Back to journey",
              "Volver al recorrido",
            )
          : tri(lang, "Voltar ao jogo", "Back to game", "Volver al juego")}
      </Link>
      <article className="review-page-card diary-entry-card">
        <header className="review-page-header">
          <Link
            className="review-page-cover"
            href={`/${lang}/game/${entry.game_slug}`}
          >
            {game?.coverUrl && (
              <Image src={game.coverUrl} alt="" fill sizes="96px" />
            )}
          </Link>
          <div className="review-page-identity">
            <span className="review-page-eyebrow">
              {tri(lang, "SESSÃO", "SESSION", "SESIÓN")}
            </span>
            <h1>
              {playedDate.format(new Date(`${entry.played_on}T00:00:00Z`))}
            </h1>
            <Link
              className="diary-entry-game"
              href={`/${lang}/game/${entry.game_slug}`}
            >
              <Gamepad2 size={13} /> {game?.name ?? entry.game_slug}
            </Link>
            <div className="review-page-byline">
              <Link
                href={`/${lang}/u/${profile.username}`}
                className="review-page-avatar"
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
                <ProfileLevelBadge
                  lang={lang}
                  standing={standing}
                  username={profile.username}
                />
              )}
              {profile.verified && (
                <VerifiedBadge lang={lang} profileId={entry.profile_id} />
              )}
              <RelativeTime value={entry.created_at} lang={lang} />
            </div>
            <div className="review-page-verdict">
              {entry.ended_on && (
                <span>
                  <CalendarDays size={13} />
                  {playedDate.format(
                    new Date(`${entry.played_on}T00:00:00Z`),
                  )}{" "}
                  – {playedDate.format(new Date(`${entry.ended_on}T00:00:00Z`))}
                </span>
              )}
              {entry.started_at && (
                <span>
                  <Clock3 size={13} /> {formatEntryTime(entry.started_at, lang)}
                </span>
              )}
              {entry.minutes ? (
                <span>
                  <Clock3 size={13} /> {formatMinutes(entry.minutes)}
                </span>
              ) : null}
              {entry.marks_start && (
                <span>
                  <Play size={12} fill="currentColor" />
                  {tri(lang, "Início", "Start", "Inicio")}
                </span>
              )}
              {entry.marks_finish && (
                <span>
                  <Flag size={12} fill="currentColor" />
                  {tri(lang, "Fim", "Finish", "Fin")}
                </span>
              )}
              {journey?.public_id && (
                <Link
                  className="review-page-journey"
                  href={`/${lang}/journal/${journey.public_id}`}
                >
                  <Map size={13} /> {journey.title}
                </Link>
              )}
            </div>
          </div>
        </header>
        {/* Journal notes render through the same restricted markdown as review
            bodies. They used to be plain text, so a pasted image link sat there
            as literal characters. */}
        {entry.note &&
          (entry.contains_spoilers ? (
            <details className="spoiler-content review-page-content">
              <summary>
                <EyeOff size={14} />
                {tri(
                  lang,
                  "Mostrar spoilers",
                  "Show spoilers",
                  "Mostrar spoilers",
                )}
              </summary>
              <MarkdownContent
                content={entry.note}
                lang={lang}
                variant="review"
              />
            </details>
          ) : (
            <div className="review-page-content diary-entry-note">
              <MarkdownContent
                content={entry.note}
                lang={lang}
                variant="review"
              />
            </div>
          ))}
        <SensitiveCover sensitive={Boolean(entry.sensitive)} lang={lang}>
          <JournalGallery
            images={images}
            lang={lang}
            spoilers={entry.contains_spoilers}
            className="diary-entry-gallery"
          />
        </SensitiveCover>
        <footer className="review-page-footer">
          <LikeButton
            contentType="diary"
            contentId={entry.id}
            count={Number(like?.like_count ?? 0)}
            liked={Boolean(like?.liked_by_viewer)}
            canLike={Boolean(user)}
            lang={lang}
          />
          <ShareButton
            className="content-share-action"
            title={game?.name ?? entry.game_slug}
            text={tri(
              lang,
              `Sessão de ${game?.name ?? entry.game_slug} por @${profile.username}`,
              `${game?.name ?? entry.game_slug} session by @${profile.username}`,
              `Sesión de ${game?.name ?? entry.game_slug} por @${profile.username}`,
            )}
            label={t.share}
            copiedLabel={t.linkCopied}
            lang={lang}
          />
          {isOwner && (
            <ActivityEntryActions
              entry={activityEntry}
              lang={lang}
              afterDelete={
                journey?.public_id
                  ? `/${lang}/journal/${journey.public_id}`
                  : `/${lang}/game/${entry.game_slug}`
              }
            />
          )}
        </footer>
      </article>
      <ContentComments
        contentType="diary"
        contentId={entry.id}
        ownerId={entry.profile_id}
        viewerId={user?.id ?? null}
        canComment={canComment}
        commentsScope={
          entry.comments_scope as "EVERYONE" | "FOLLOWERS" | "NOBODY"
        }
        lang={lang}
      />
    </main>
  );
}
