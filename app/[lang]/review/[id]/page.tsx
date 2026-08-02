import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  EyeOff,
  Gamepad2,
  Map,
  RotateCcw,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { ActivityEntryActions } from "@/components/social/activity-entry-actions";
import type { SocialEntry } from "@/components/social/activity-stream";
import { LikeButton } from "@/components/social/like-button";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { ProfileLevelBadge } from "@/components/profile-level-badge";
import { getProfileLevel } from "@/lib/profile-level";
import { RelativeTime } from "@/components/relative-time";
import { resolveGameCover } from "@/lib/game-cover";
import { getGamesByIds } from "@/lib/igdb";
import { ContentComments } from "@/components/social/content-comments";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { MentionText } from "@/components/social/mention-text";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { jsonLd, localeAlternates, SITE_URL } from "@/lib/seo";
import { contentKey } from "@/lib/public-id";

type Props = { params: Promise<{ lang: string; id: string }> };
type RatingMode = NonNullable<SocialEntry["ratingMode"]>;
type Aspect = {
  label: string;
  rating: number;
  note?: string | null;
  custom?: boolean;
};

const reviewSelect =
  "id,public_id,profile_id,igdb_id,game_slug,rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,created_at,updated_at,journey_id,journeys!reviews_journey_id_fkey(title,public_id),profiles!reviews_profile_id_fkey(username,display_name,avatar_url,verified,content_comment_scope)";

function formatRating(rating: number, mode: RatingMode, lang: UiLang) {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const key = contentKey(id);
  if (!hasLocale(lang) || !key) return {};
  const { data: review } = await (
    await getSupabase()
  )
    .from("reviews")
    .select(
      "public_id,title,content,contains_spoilers,game_slug,profiles!reviews_profile_id_fkey(username)",
    )
    .eq(key[0], key[1])
    .maybeSingle();
  if (!review) return {};
  const owner = Array.isArray(review.profiles)
    ? review.profiles[0]
    : review.profiles;
  const title =
    review.title ||
    (lang === "pt-BR"
      ? `Avaliação de @${owner?.username}`
      : `Review by @${owner?.username}`);
  const description = review.contains_spoilers
    ? tri(
        lang,
        `Avaliação com spoilers publicada por @${owner?.username}.`,
        `A spoiler review published by @${owner?.username}.`,
        `Una reseña con spoilers publicada por @${owner?.username}.`,
      )
    : (review.content ?? "").slice(0, 160) || undefined;
  return {
    title,
    description,
    alternates: localeAlternates(lang, `/review/${review.public_id}`),
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "article",
      siteName: "uloggd",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · uloggd`,
      description,
    },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { lang, id } = await params;
  const key = contentKey(id);
  if (!hasLocale(lang) || !key) notFound();
  const supabase = await getSupabase();
  const [{ data: review }, user] = await Promise.all([
    supabase
      .from("reviews")
      .select(reviewSelect)
      .eq(key[0], key[1])
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!review) notFound();
  if (key[0] === "id") permanentRedirect(`/${lang}/review/${review.public_id}`);
  const profile = Array.isArray(review.profiles)
    ? review.profiles[0]
    : review.profiles;
  const standing = await getProfileLevel(supabase, review.profile_id);
  if (!profile?.username) notFound();
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const isOwner = user?.id === review.profile_id;

  const [
    games,
    { data: likeRows },
    { data: customCovers },
    { data: viewerPreference },
    { data: follow },
  ] = await Promise.all([
    getGamesByIds([review.igdb_id]),
    supabase.rpc("get_content_likes", {
      target_type: "review",
      target_ids: [review.id],
    }),
    user
      ? supabase
          .from("user_games")
          .select("profile_id,custom_cover_url")
          .in("profile_id", [...new Set([user.id, review.profile_id])])
          .eq("igdb_id", review.igdb_id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", review.profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const game = games[0] ?? null;
  const coverOwner =
    viewerPreference?.custom_cover_scope === "EVERYONE"
      ? review.profile_id
      : user?.id;
  const customCover = customCovers?.find(
    (cover) => cover.profile_id === coverOwner,
  );
  const coverUrl = game
    ? resolveGameCover(game.coverUrl, customCover?.custom_cover_url)
    : null;
  const likeState = likeRows?.[0] as
    { like_count: number; liked_by_viewer: boolean } | undefined;

  const journeyJoin = Array.isArray(review.journeys)
    ? review.journeys[0]
    : review.journeys;
  const journeyTitle = journeyJoin?.title ?? null;
  const journeyPublicId = journeyJoin?.public_id ?? null;
  const ratingMode = (review.rating_mode ?? "stars_5") as RatingMode;
  const aspects = (review.aspect_ratings ?? []) as Aspect[];
  const playedDate = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const edited =
    new Date(review.updated_at).getTime() -
      new Date(review.created_at).getTime() >
    1000;

  const entry: SocialEntry = {
    id: review.id,
    publicId: review.public_id,
    kind: "review",
    profileId: review.profile_id,
    profile,
    igdbId: review.igdb_id,
    gameSlug: review.game_slug,
    game: game ? { ...game, coverUrl: coverUrl ?? game.coverUrl } : null,
    rating: typeof review.rating === "number" ? review.rating : undefined,
    ratingMode,
    recommended: review.recommended,
    title: review.title,
    aspects,
    mastered: Boolean(review.mastered),
    replay: Boolean(review.replay),
    platform: review.platform,
    startedOn: review.started_on,
    finishedOn: review.finished_on,
    content: review.content,
    journeyId: review.journey_id,
    journeyTitle,
    journeyPublicId,
    spoilers: Boolean(review.contains_spoilers),
    visibility: review.visibility,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };

  return (
    <main className="social-page review-page">
      {/* A review with a rating is the one thing here a search engine can show
          as more than a blue link. Only emitted for a public review with a
          rating: describing a followers-only post to a crawler would be
          publishing it, and a Review without reviewRating is ignored anyway. */}
      {review.visibility === "PUBLIC" && typeof review.rating === "number" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@type": "Review",
            "@id": `${SITE_URL}/${lang}/review/${review.public_id}`,
            url: `${SITE_URL}/${lang}/review/${review.public_id}`,
            name: review.title || undefined,
            datePublished: review.created_at,
            dateModified: review.updated_at ?? undefined,
            inLanguage: lang,
            // Spoiler text stays out: the flag exists so the words are not read
            // before someone chooses to, and a search snippet is not a choice.
            reviewBody: review.contains_spoilers
              ? undefined
              : (review.content ?? undefined),
            author: {
              "@type": "Person",
              name: profile?.display_name || `@${profile?.username}`,
              url: `${SITE_URL}/${lang}/u/${profile?.username}`,
            },
            itemReviewed: {
              "@type": "VideoGame",
              name: game?.name ?? review.game_slug,
              url: `${SITE_URL}/${lang}/game/${review.game_slug}`,
              image: game?.coverUrl ?? undefined,
            },
            reviewRating: {
              "@type": "Rating",
              // Normalised to a five-point scale regardless of the scale the
              // author writes in, since the schema needs one consistent range.
              ratingValue: Number((review.rating / 20).toFixed(1)),
              bestRating: 5,
              worstRating: 0,
            },
            publisher: { "@id": `${SITE_URL}/#organization` },
          })}
        />
      )}
      <Link
        className="page-back-link"
        href={`/${lang}/game/${review.game_slug}`}
      >
        <ArrowLeft size={14} />{" "}
        {pt
          ? `Voltar para ${game?.name ?? "o jogo"}`
          : `Back to ${game?.name ?? "the game"}`}
      </Link>

      <article className="review-page-card">
        <header className="review-page-header">
          <Link
            className="review-page-cover"
            href={`/${lang}/game/${review.game_slug}`}
          >
            {coverUrl && <Image src={coverUrl} alt="" fill sizes="120px" />}
          </Link>
          <div className="review-page-identity">
            <h1>
              {review.title ||
                (pt
                  ? `Avaliação de ${game?.name ?? review.game_slug}`
                  : `${game?.name ?? review.game_slug} review`)}
            </h1>
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
                <ProfileLevelBadge lang={lang} standing={standing} />
              )}
              {profile.verified && <VerifiedBadge lang={lang} />}
              <RelativeTime value={review.created_at} lang={lang}>
                {edited && (
                  <small className="activity-edited">
                    {" "}
                    · {tri(lang, "editada", "edited", "editada")}
                  </small>
                )}
              </RelativeTime>
            </div>
            <div className="review-page-verdict">
              {typeof review.rating === "number" && (
                <span className="review-page-rating">
                  {ratingMode === "recommend" ? (
                    review.recommended ? (
                      <Check size={15} />
                    ) : (
                      <X size={15} />
                    )
                  ) : (
                    <Star size={15} fill="currentColor" />
                  )}
                  {ratingMode === "recommend"
                    ? review.recommended
                      ? t.recommended
                      : t.notRecommended
                    : formatRating(review.rating, ratingMode, lang)}
                </span>
              )}
              {review.mastered && (
                <span>
                  <Trophy size={13} />{" "}
                  {tri(lang, "Dominado", "Mastered", "Dominado")}
                </span>
              )}
              {review.replay && (
                <span>
                  <RotateCcw size={13} /> {t.replay}
                </span>
              )}
              {review.platform && (
                <span>
                  <Gamepad2 size={13} /> {review.platform}
                </span>
              )}
              {journeyTitle && journeyPublicId && (
                <Link
                  className="review-page-journey"
                  href={`/${lang}/journal/${journeyPublicId}`}
                >
                  <Map size={13} /> {journeyTitle}
                </Link>
              )}
              {(review.started_on || review.finished_on) && (
                <span>
                  <CalendarDays size={13} />{" "}
                  {[
                    review.started_on
                      ? playedDate.format(
                          new Date(`${review.started_on}T00:00:00Z`),
                        )
                      : null,
                    review.finished_on
                      ? playedDate.format(
                          new Date(`${review.finished_on}T00:00:00Z`),
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" – ")}
                </span>
              )}
            </div>
          </div>
        </header>

        {review.content &&
          (review.contains_spoilers ? (
            <details className="spoiler-content review-page-content">
              <summary>
                <EyeOff size={14} />{" "}
                {tri(
                  lang,
                  "Mostrar conteúdo com spoilers",
                  "Show spoiler content",
                  "Mostrar contenido con spoilers",
                )}
              </summary>
              <MarkdownContent
                content={review.content}
                lang={lang}
                variant="review"
              />
            </details>
          ) : (
            <div className="review-page-content">
              <MarkdownContent
                content={review.content}
                lang={lang}
                variant="review"
              />
            </div>
          ))}

        {aspects.length > 0 && (
          <section className="review-page-aspects">
            <h2>
              {tri(
                lang,
                "Aspectos avaliados",
                "Rated aspects",
                "Aspectos valorados",
              )}
            </h2>
            <div>
              {aspects.map((aspect) => (
                <article key={aspect.label}>
                  <header>
                    <strong>{aspect.label}</strong>
                    <output>{aspect.rating}</output>
                  </header>
                  <div
                    className="review-page-aspect-meter"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={aspect.rating}
                    aria-label={aspect.label}
                  >
                    <i style={{ width: `${aspect.rating}%` }} />
                  </div>
                  {aspect.note && (
                    <p>
                      <MentionText text={aspect.note} lang={lang} />
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="review-page-footer">
          <LikeButton
            contentType="review"
            contentId={review.id}
            count={Number(likeState?.like_count ?? 0)}
            liked={Boolean(likeState?.liked_by_viewer)}
            canLike={Boolean(user)}
            lang={lang}
          />
          <ShareButton
            className="content-share-action"
            title={review.title || (game?.name ?? "uloggd")}
            text={
              pt
                ? `Avaliação de ${game?.name ?? review.game_slug} por @${profile.username}`
                : `${game?.name ?? review.game_slug} review by @${profile.username}`
            }
            label={t.share}
            copiedLabel={t.linkCopied}
            lang={lang}
          />
          {isOwner && (
            <ActivityEntryActions
              entry={entry}
              lang={lang}
              afterDelete={`/${lang}/game/${review.game_slug}`}
            />
          )}
        </footer>
      </article>
      <ContentComments
        contentType="review"
        contentId={review.id}
        ownerId={review.profile_id}
        viewerId={user?.id ?? null}
        canComment={
          Boolean(user) &&
          (isOwner ||
            profile.content_comment_scope === "EVERYONE" ||
            (profile.content_comment_scope === "FOLLOWERS" && Boolean(follow)))
        }
        commentsScope={profile.content_comment_scope}
        lang={lang}
      />
    </main>
  );
}
