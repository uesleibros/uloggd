import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  EyeOff,
  Gamepad2,
  RotateCcw,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityEntryActions } from "@/components/social/activity-entry-actions";
import type { SocialEntry } from "@/components/social/activity-stream";
import { LikeButton } from "@/components/social/like-button";
import { ShareButton } from "@/components/share-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { resolveGameCover } from "@/lib/game-cover";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../../dictionaries";

type Props = { params: Promise<{ lang: string; id: string }> };
type RatingMode = NonNullable<SocialEntry["ratingMode"]>;
type Aspect = {
  label: string;
  rating: number;
  note?: string | null;
  custom?: boolean;
};

const reviewSelect =
  "id,profile_id,igdb_id,game_slug,rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,created_at,updated_at,profiles!reviews_profile_id_fkey(username,display_name,avatar_url,verified)";

function formatRating(rating: number, mode: RatingMode, lang: "pt-BR" | "en") {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[0-9a-f-]{36}$/i.test(id)) return {};
  const { data: review } = await (await getSupabase())
    .from("reviews")
    .select("title,content,game_slug,profiles!reviews_profile_id_fkey(username)")
    .eq("id", id)
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
  const description = (review.content ?? "").slice(0, 160) || undefined;
  return {
    title,
    description,
    openGraph: {
      title: `${title} · uloggd`,
      description,
      type: "article",
      siteName: "uloggd",
    },
    twitter: { card: "summary", title: `${title} · uloggd`, description },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await getSupabase();
  const [{ data: review }, user] = await Promise.all([
    supabase.from("reviews").select(reviewSelect).eq("id", id).maybeSingle(),
    getAuthUser(),
  ]);
  if (!review) notFound();
  const profile = Array.isArray(review.profiles)
    ? review.profiles[0]
    : review.profiles;
  if (!profile?.username) notFound();
  const pt = lang === "pt-BR";
  const isOwner = user?.id === review.profile_id;

  const [games, { data: likeRows }, { data: customCover }] = await Promise.all([
    getGamesByIds([review.igdb_id]),
    supabase.rpc("get_content_likes", {
      target_type: "review",
      target_ids: [review.id],
    }),
    user
      ? supabase
          .from("user_games")
          .select("custom_cover_url")
          .eq("profile_id", user.id)
          .eq("igdb_id", review.igdb_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const game = games[0] ?? null;
  const coverUrl = game
    ? resolveGameCover(game.coverUrl, customCover?.custom_cover_url)
    : null;
  const likeState = likeRows?.[0] as
    | { like_count: number; liked_by_viewer: boolean }
    | undefined;

  const ratingMode = (review.rating_mode ?? "stars_5") as RatingMode;
  const aspects = (review.aspect_ratings ?? []) as Aspect[];
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const edited =
    new Date(review.updated_at).getTime() -
      new Date(review.created_at).getTime() >
    1000;

  const entry: SocialEntry = {
    id: review.id,
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
    spoilers: Boolean(review.contains_spoilers),
    visibility: review.visibility,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };

  return (
    <main className="social-page review-page">
      <Link className="page-back-link" href={`/${lang}/game/${review.game_slug}`}>
        <ArrowLeft size={14} />{" "}
        {pt ? `Voltar para ${game?.name ?? "o jogo"}` : `Back to ${game?.name ?? "the game"}`}
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
            <span className="review-page-eyebrow">
              {pt ? "AVALIAÇÃO" : "REVIEW"}
            </span>
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
                <strong>{profile.display_name || `@${profile.username}`}</strong>
              </Link>
              {profile.verified && <VerifiedBadge lang={lang} />}
              <time dateTime={review.created_at}>
                {date.format(new Date(review.created_at))}
                {edited && (
                  <small className="activity-edited">
                    {" "}
                    · {pt ? "editada" : "edited"}
                  </small>
                )}
              </time>
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
                      ? pt
                        ? "Recomendo"
                        : "Recommended"
                      : pt
                        ? "Não recomendo"
                        : "Not recommended"
                    : formatRating(review.rating, ratingMode, lang)}
                </span>
              )}
              {review.mastered && (
                <span>
                  <Trophy size={13} /> {pt ? "Dominado" : "Mastered"}
                </span>
              )}
              {review.replay && (
                <span>
                  <RotateCcw size={13} /> {pt ? "Rejogada" : "Replay"}
                </span>
              )}
              {review.platform && (
                <span>
                  <Gamepad2 size={13} /> {review.platform}
                </span>
              )}
              {(review.started_on || review.finished_on) && (
                <span>
                  <CalendarDays size={13} />{" "}
                  {[
                    review.started_on
                      ? date.format(new Date(`${review.started_on}T00:00:00Z`))
                      : null,
                    review.finished_on
                      ? date.format(new Date(`${review.finished_on}T00:00:00Z`))
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
                {pt ? "Mostrar conteúdo com spoilers" : "Show spoiler content"}
              </summary>
              <p>{review.content}</p>
            </details>
          ) : (
            <p className="review-page-content">{review.content}</p>
          ))}

        {aspects.length > 0 && (
          <section className="review-page-aspects">
            <h2>{pt ? "Aspectos avaliados" : "Rated aspects"}</h2>
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
                  {aspect.note && <p>{aspect.note}</p>}
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
            canLike={Boolean(user) && !isOwner}
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
            label={pt ? "Compartilhar" : "Share"}
            copiedLabel={pt ? "Link copiado" : "Link copied"}
            lang={lang}
          />
          {isOwner && <ActivityEntryActions entry={entry} lang={lang} />}
        </footer>
      </article>
    </main>
  );
}
