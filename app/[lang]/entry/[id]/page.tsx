import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3, Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentComments } from "@/components/social/content-comments";
import { RelativeTime } from "@/components/relative-time";
import { LikeButton } from "@/components/social/like-button";
import { ShareButton } from "@/components/share-button";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { tri, uiText } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[23456789A-HJ-NP-Za-km-z]{10}$/.test(id))
    return {};
  const { data: entry } = await (
    await getSupabase()
  )
    .from("diary_entries")
    .select(
      "public_id,igdb_id,game_slug,note,contains_spoilers,played_on,profiles!diary_entries_profile_id_fkey(username)",
    )
    .eq("public_id", id)
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
  if (!hasLocale(lang) || !/^[23456789A-HJ-NP-Za-km-z]{10}$/.test(id))
    notFound();
  const supabase = await getSupabase();
  const [{ data: entry }, user] = await Promise.all([
    supabase
      .from("diary_entries")
      .select(
        "id,public_id,profile_id,igdb_id,game_slug,played_on,ended_on,minutes,note,contains_spoilers,visibility,comments_scope,created_at,profiles!diary_entries_profile_id_fkey(username,display_name,content_comment_scope)",
      )
      .eq("public_id", id)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!entry) notFound();
  const profile = Array.isArray(entry.profiles)
    ? entry.profiles[0]
    : entry.profiles;
  if (!profile) notFound();
  const [games, { data: likes }, { data: follow }] = await Promise.all([
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
  ]);
  const game = games[0];
  const like = likes?.[0] as
    { like_count: number; liked_by_viewer: boolean } | undefined;
  const t = uiText(lang);
  const canComment =
    Boolean(user) &&
    (user?.id === entry.profile_id ||
      ((profile.content_comment_scope === "EVERYONE" ||
        (profile.content_comment_scope === "FOLLOWERS" && Boolean(follow))) &&
        (entry.comments_scope === "EVERYONE" ||
          (entry.comments_scope === "FOLLOWERS" && Boolean(follow)))));
  return (
    <main className="social-page diary-entry-page">
      <article className="diary-entry-post">
        <header>
          <h1>{game?.name ?? entry.game_slug}</h1>
          <Link href={`/${lang}/u/${profile.username}`}>
            {profile.display_name || `@${profile.username}`}
          </Link>
        </header>
        <div className="diary-entry-meta">
          <span>
            <CalendarDays size={14} />
            <RelativeTime value={`${entry.played_on}T00:00:00Z`} lang={lang} />
          </span>
          {entry.minutes && (
            <span>
              <Clock3 size={14} /> {Math.floor(entry.minutes / 60)}h{" "}
              {entry.minutes % 60}m
            </span>
          )}
          <Link href={`/${lang}/game/${entry.game_slug}`}>
            <Gamepad2 size={14} /> {tri(lang, "Jogo", "Game", "Juego")}
          </Link>
        </div>
        {entry.note &&
          (entry.contains_spoilers ? (
            <details className="spoiler-content">
              <summary>
                {tri(
                  lang,
                  "Mostrar spoilers",
                  "Show spoilers",
                  "Mostrar spoilers",
                )}
              </summary>
              <p>{entry.note}</p>
            </details>
          ) : (
            <p>{entry.note}</p>
          ))}
        <footer className="review-page-footer">
          <LikeButton
            contentType="diary"
            contentId={entry.id}
            count={Number(like?.like_count ?? 0)}
            liked={Boolean(like?.liked_by_viewer)}
            canLike={Boolean(user) && user?.id !== entry.profile_id}
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
