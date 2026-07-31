import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, EyeOff, Gamepad2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ContentComments } from "@/components/social/content-comments";
import { LikeButton } from "@/components/social/like-button";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ScreenshotActions } from "@/components/social/screenshot-actions";
import { MentionText } from "@/components/social/mention-text";
import { RelativeTime } from "@/components/relative-time";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import {
  isMissingSchemaError,
  warnSchemaGap,
} from "@/lib/supabase/schema-fallback";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";
import { localeAlternates } from "@/lib/seo";

type Props = { params: Promise<{ lang: string; id: string }> };

// deleted_at arrives with the screenshot-moderation migration. Naming a column
// the database does not have yet fails the whole select, and this page reads a
// null row as "gone", which is how every screenshot turned into a 404. Both
// selects below fall back to the pre-migration shape.
// Both variants are written out in full: supabase-js derives the row type from
// the literal select string, so composing one loses every property.
const screenshotSelect =
  "id,public_id,profile_id,igdb_id,game_slug,storage_path,description,contains_spoilers,visibility,comments_scope,width,height,created_at,deleted_at,profiles!screenshots_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope)";
const screenshotSelectLegacy =
  "id,public_id,profile_id,igdb_id,game_slug,storage_path,description,contains_spoilers,visibility,comments_scope,width,height,created_at,profiles!screenshots_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope)";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[23456789A-HJ-NP-Za-km-z]{10}$/.test(id))
    return {};
  const supabase = await getSupabase();
  const first = await supabase
    .from("screenshots")
    .select(
      "public_id,description,game_slug,contains_spoilers,deleted_at,profiles!screenshots_profile_id_fkey(username)",
    )
    .eq("public_id", id)
    .maybeSingle();
  let data = first.data;
  if (isMissingSchemaError(first.error)) {
    const { data: fallback } = await supabase
      .from("screenshots")
      .select(
        "public_id,description,game_slug,contains_spoilers,profiles!screenshots_profile_id_fkey(username)",
      )
      .eq("public_id", id)
      .maybeSingle();
    data = fallback
      ? ({ ...fallback, deleted_at: null } as NonNullable<typeof data>)
      : null;
  }
  if (!data || data.deleted_at) return {};
  const profile = Array.isArray(data.profiles)
    ? data.profiles[0]
    : data.profiles;
  const title = tri(
    lang,
    `Captura de @${profile?.username}`,
    `Screenshot by @${profile?.username}`,
    `Captura de @${profile?.username}`,
  );
  const description = data.contains_spoilers
    ? tri(
        lang,
        `Captura com spoilers publicada por @${profile?.username}.`,
        `A spoiler screenshot published by @${profile?.username}.`,
        `Una captura con spoilers publicada por @${profile?.username}.`,
      )
    : data.description?.slice(0, 160) || undefined;
  // The description of a spoiler shot stays behind the gate; putting it in the
  // meta tag would spill it into search results and link previews.
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/shot/${data.public_id}`),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "article",
      siteName: "uloggd",
    },
    twitter: {
      card: "summary",
      title: `${title} · uloggd`,
      description,
    },
  };
}

export default async function ScreenshotPage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[23456789A-HJ-NP-Za-km-z]{10}$/.test(id))
    notFound();
  const supabase = await getSupabase();
  const [shotResult, user] = await Promise.all([
    supabase
      .from("screenshots")
      .select(screenshotSelect)
      .eq("public_id", id)
      .maybeSingle(),
    getAuthUser(),
  ]);
  let shot = shotResult.data;
  if (isMissingSchemaError(shotResult.error)) {
    warnSchemaGap("screenshots.deleted_at", shotResult.error);
    const { data: fallback } = await supabase
      .from("screenshots")
      .select(screenshotSelectLegacy)
      .eq("public_id", id)
      .maybeSingle();
    shot = fallback
      ? ({ ...fallback, deleted_at: null } as NonNullable<typeof shot>)
      : null;
  }
  // Moderators keep read access so the console can show an actioned report, but
  // the public page is not where a removed screenshot should surface.
  if (!shot || shot.deleted_at) notFound();
  const profile = Array.isArray(shot.profiles)
    ? shot.profiles[0]
    : shot.profiles;
  if (!profile?.username) notFound();
  const [{ data: signed }, games, { data: likes }, { data: follow }] =
    await Promise.all([
      supabase.storage
        .from("screenshots")
        .createSignedUrl(shot.storage_path, 3600),
      getGamesByIds([shot.igdb_id]),
      supabase.rpc("get_content_likes", {
        target_type: "screenshot",
        target_ids: [shot.id],
      }),
      user && user.id !== shot.profile_id
        ? supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", shot.profile_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  if (!signed?.signedUrl) notFound();
  const game = games[0] ?? null;
  const like = likes?.[0] as
    { like_count: number; liked_by_viewer: boolean } | undefined;
  const media = (
    <Image
      src={signed.signedUrl}
      alt={
        // Behind a spoiler gate the description is the spoiler, so a screen
        // reader must get the neutral caption instead.
        (!shot.contains_spoilers && shot.description) ||
        tri(
          lang,
          `Captura de ${game?.name ?? shot.game_slug}`,
          `Screenshot from ${game?.name ?? shot.game_slug}`,
          `Captura de ${game?.name ?? shot.game_slug}`,
        )
      }
      width={shot.width}
      height={shot.height}
      sizes="(max-width: 760px) 100vw, 760px"
      unoptimized
      priority
    />
  );

  return (
    <main className="social-page screenshot-page">
      <Link className="page-back-link" href={`/${lang}/game/${shot.game_slug}`}>
        <ArrowLeft size={14} />{" "}
        {tri(
          lang,
          `Voltar para ${game?.name ?? "o jogo"}`,
          `Back to ${game?.name ?? "the game"}`,
          `Volver a ${game?.name ?? "el juego"}`,
        )}
      </Link>
      <article className="screenshot-post">
        {shot.contains_spoilers ? (
          <details className="screenshot-spoiler-gate">
            <summary>
              <EyeOff size={20} />
              <strong>
                {tri(
                  lang,
                  "Captura com spoilers",
                  "Spoiler screenshot",
                  "Captura con spoilers",
                )}
              </strong>
              <span>
                {tri(
                  lang,
                  "Toque para revelar",
                  "Tap to reveal",
                  "Toca para revelar",
                )}
              </span>
            </summary>
            {media}
            {shot.description && (
              <p className="screenshot-spoiler-description">
                <MentionText text={shot.description} lang={lang} />
              </p>
            )}
          </details>
        ) : (
          media
        )}
        <div className="screenshot-post-body">
          <header>
            <Link
              href={`/${lang}/u/${profile.username}`}
              className="screenshot-author"
            >
              <span>
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    fill
                    sizes="36px"
                    unoptimized
                  />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </span>
              <span>
                <strong>
                  {profile.display_name || `@${profile.username}`}
                </strong>
                <small>@{profile.username}</small>
              </span>
            </Link>
            {profile.verified && <VerifiedBadge lang={lang} />}
            <RelativeTime value={shot.created_at} lang={lang} />
            <ScreenshotActions
              viewerId={user?.id ?? null}
              lang={lang}
              shot={{
                id: shot.id,
                publicId: shot.public_id,
                ownerId: shot.profile_id,
                ownerUsername: profile.username,
                description: shot.description ?? "",
                spoilers: shot.contains_spoilers,
                visibility: shot.visibility,
              }}
            />
          </header>
          <Link
            className="screenshot-game"
            href={`/${lang}/game/${shot.game_slug}`}
          >
            <Gamepad2 size={14} /> {game?.name ?? shot.game_slug}
          </Link>
          {shot.description && !shot.contains_spoilers && (
            <p>
              <MentionText text={shot.description} lang={lang} />
            </p>
          )}
          <footer>
            <LikeButton
              contentType="screenshot"
              contentId={shot.id}
              count={Number(like?.like_count ?? 0)}
              liked={Boolean(like?.liked_by_viewer)}
              canLike={Boolean(user) && user?.id !== shot.profile_id}
              lang={lang}
            />
            <ShareButton
              title={game?.name ?? shot.game_slug}
              text={tri(
                lang,
                `Captura de ${game?.name ?? shot.game_slug} no uloggd`,
                `${game?.name ?? shot.game_slug} screenshot on uloggd`,
                `Captura de ${game?.name ?? shot.game_slug} en uloggd`,
              )}
              label={tri(lang, "Compartilhar", "Share", "Compartir")}
              copiedLabel={tri(
                lang,
                "Link copiado",
                "Link copied",
                "Enlace copiado",
              )}
              lang={lang}
            />
          </footer>
        </div>
      </article>
      <ContentComments
        contentType="screenshot"
        contentId={shot.id}
        ownerId={shot.profile_id}
        viewerId={user?.id ?? null}
        canComment={
          Boolean(user) &&
          (user?.id === shot.profile_id ||
            ((profile.content_comment_scope === "EVERYONE" ||
              (profile.content_comment_scope === "FOLLOWERS" &&
                Boolean(follow))) &&
              (shot.comments_scope === "EVERYONE" ||
                (shot.comments_scope === "FOLLOWERS" && Boolean(follow)))))
        }
        commentsScope={
          shot.comments_scope as "EVERYONE" | "FOLLOWERS" | "NOBODY"
        }
        lang={lang}
      />
    </main>
  );
}
