import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Clock3,
  EyeOff,
  Flag,
  Map,
  NotebookPen,
  Play,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type { Game } from "@/lib/igdb";
import type { JournalImage } from "@/lib/journal-images";
import { formatEntryTime } from "@/lib/journal-entry";
import { RelativeTime } from "@/components/relative-time";
import { JournalGallery } from "./journal-gallery";
import { ActivityEntryActions } from "./activity-entry-actions";
import { LikeButton } from "./like-button";
import { ReviewMarkdownPreview } from "./review-markdown-preview";
import { OrganizationMark, VerifiedBadge } from "../verified-badge";
import { ShelfCarousel } from "../shelf-carousel";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { StreamLevelBadge, StreamLevelProvider } from "./stream-levels";
import { SensitiveCover } from "./sensitive-cover";
import { Reveal } from "@/components/ui/reveal";

export type SocialEntry = {
  id: string;
  publicId?: string;
  kind: "review" | "diary" | "screenshot";
  profileId: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
    account_type?: "PERSON" | "ORGANIZATION";
  };
  igdbId: number;
  gameSlug: string;
  game: Game | null;
  rating?: number;
  ratingMode?: "stars_5" | "level_5" | "score_10" | "score_100" | "recommend";
  recommended?: boolean | null;
  title?: string | null;
  aspects?: Array<{
    label: string;
    rating: number;
    note?: string | null;
    custom?: boolean;
  }>;
  mastered?: boolean;
  replay?: boolean;
  platform?: string | null;
  startedOn?: string | null;
  finishedOn?: string | null;
  content?: string | null;
  imageUrl?: string;
  /** Cover the pictures until the viewer asks. Screenshots and sessions. */
  sensitive?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  images?: JournalImage[];
  playedOn?: string;
  endedOn?: string | null;
  /** Optional wall-clock start of a journal entry, `HH:MM:SS`. */
  startedAt?: string | null;
  minutes?: number | null;
  marksStart?: boolean;
  marksFinish?: boolean;
  journeyId?: string | null;
  journeyTitle?: string | null;
  journeyPublicId?: string | null;
  spoilers: boolean;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  commentsScope?: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  createdAt: string;
  updatedAt?: string;
  likes?: number;
  likedByViewer?: boolean;
};

export function ActivityStream({
  entries,
  lang,
  viewerId,
  display = "timeline",
  carousel,
}: {
  entries: SocialEntry[];
  lang: UiLang;
  viewerId?: string | null;
  display?: "timeline" | "archive";
  carousel?: { label: string; autoPlay?: boolean; className?: string };
}) {
  const t = uiText(lang);
  const playedDate = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (!entries.length)
    return (
      <div className="social-empty">
        <span aria-hidden>
          <NotebookPen size={22} />
        </span>
        <h2>
          {tri(
            lang,
            "Nada registrado ainda",
            "Nothing logged yet",
            "Nada registrado todavía",
          )}
        </h2>
        <p>
          {tri(
            lang,
            "Avaliações e sessões públicas aparecerão aqui.",
            "Public reviews and sessions will appear here.",
            "Las reseñas y sesiones públicas aparecerán aquí.",
          )}
        </p>
      </div>
    );
  const items = entries.map((entry, index) => (
    // The wrapper is a client component and the entry inside it is not, so
    // the markup stays server-rendered and only the animation ships.
    <Reveal key={`${entry.kind}-${entry.id}`} index={index}>
      <article className="activity-entry" data-kind={entry.kind}>
        <Link
          className="activity-cover"
          href={`/${lang}/game/${entry.gameSlug}`}
        >
          {entry.game && (
            <Image src={entry.game.coverUrl} alt="" fill sizes="72px" />
          )}
        </Link>
        <div className="activity-body">
          <header>
            <div className="activity-user">
              <Link
                href={`/${lang}/u/${entry.profile.username}`}
                className="activity-avatar"
                data-account-type={entry.profile.account_type}
              >
                {entry.profile.avatar_url ? (
                  <Image
                    src={entry.profile.avatar_url}
                    alt=""
                    fill
                    sizes="32px"
                    unoptimized
                  />
                ) : (
                  entry.profile.username.slice(0, 1).toUpperCase()
                )}
              </Link>
              <span>
                <strong>
                  <Link href={`/${lang}/u/${entry.profile.username}`}>
                    {entry.profile.display_name || `@${entry.profile.username}`}
                  </Link>
                  <StreamLevelBadge profileId={entry.profileId} lang={lang} />
                  {entry.profile.verified && <VerifiedBadge lang={lang} />}
                  {entry.profile.account_type === "ORGANIZATION" && (
                    <OrganizationMark lang={lang} />
                  )}
                </strong>
                <Link href={`/${lang}/u/${entry.profile.username}`}>
                  <small>@{entry.profile.username}</small>
                </Link>
              </span>
            </div>
            <RelativeTime value={entry.createdAt} lang={lang}>
              {entry.updatedAt &&
                new Date(entry.updatedAt).getTime() -
                  new Date(entry.createdAt).getTime() >
                  1000 && (
                  <small className="activity-edited">
                    {" "}
                    · {tri(lang, "editada", "edited", "editada")}
                  </small>
                )}
            </RelativeTime>
          </header>
          <p className="activity-verb">
            {entry.kind === "review"
              ? tri(lang, "avaliou", "reviewed", "reseñó")
              : entry.kind === "screenshot"
                ? tri(
                    lang,
                    "compartilhou uma captura de",
                    "shared a screenshot from",
                    "compartió una captura de",
                  )
                : entry.endedOn
                  ? tri(
                      lang,
                      "registrou uma jornada em",
                      "logged a journey in",
                      "registró un recorrido en",
                    )
                  : tri(
                      lang,
                      "registrou uma sessão de",
                      "logged a session of",
                      "registró una sesión de",
                    )}{" "}
            <Link href={`/${lang}/game/${entry.gameSlug}`}>
              {entry.game?.name ?? entry.gameSlug}
            </Link>
          </p>
          {entry.kind === "screenshot" && entry.imageUrl && (
            <SensitiveCover sensitive={Boolean(entry.sensitive)} lang={lang}>
              <Link
                className="activity-screenshot"
                href={`/${lang}/shot/${entry.publicId ?? entry.id}`}
              >
                <Image
                  src={entry.imageUrl}
                  alt=""
                  width={entry.imageWidth ?? 1280}
                  height={entry.imageHeight ?? 720}
                  sizes="(max-width: 760px) 100vw, 640px"
                  unoptimized
                />
                {entry.spoilers && (
                  <span>
                    <EyeOff size={18} />
                    {tri(
                      lang,
                      "Revelar captura",
                      "Reveal screenshot",
                      "Revelar captura",
                    )}
                  </span>
                )}
              </Link>
            </SensitiveCover>
          )}
          {entry.kind === "review" && typeof entry.rating === "number" && (
            <div
              className="activity-rating"
              aria-label={formatActivityRating(
                entry.rating,
                entry.ratingMode,
                lang,
              )}
            >
              {entry.ratingMode === "recommend" ? (
                entry.recommended ? (
                  <Check size={14} />
                ) : (
                  <X size={14} />
                )
              ) : (
                <Star size={14} fill="currentColor" />
              )}{" "}
              {entry.ratingMode === "recommend"
                ? entry.recommended
                  ? t.recommended
                  : t.notRecommended
                : formatActivityRating(entry.rating, entry.ratingMode, lang)}
            </div>
          )}
          {entry.kind === "review" && entry.title && (
            <h3 className="activity-review-title">
              <Link href={`/${lang}/review/${entry.publicId ?? entry.id}`}>
                {entry.title}
              </Link>
            </h3>
          )}
          {entry.kind === "review" &&
            (entry.mastered ||
              entry.replay ||
              entry.platform ||
              entry.journeyTitle) && (
              <div className="activity-meta activity-review-meta">
                {entry.mastered && (
                  <span>
                    <Trophy size={13} />{" "}
                    {tri(lang, "Dominado", "Mastered", "Dominado")}
                  </span>
                )}
                {entry.replay && <span>{t.replay}</span>}
                {entry.platform && <span>{entry.platform}</span>}
                {entry.journeyTitle && entry.journeyPublicId && (
                  <Link
                    className="activity-journey-button"
                    href={`/${lang}/journal/${entry.journeyPublicId}`}
                  >
                    <Map size={13} />
                    {entry.journeyTitle}
                  </Link>
                )}
              </div>
            )}
          {entry.kind === "diary" && (
            <div className="activity-meta">
              <span>
                <CalendarDays size={13} />{" "}
                {entry.playedOn
                  ? entry.endedOn
                    ? `${playedDate.format(new Date(`${entry.playedOn}T00:00:00Z`))} – ${playedDate.format(new Date(`${entry.endedOn}T00:00:00Z`))}`
                    : playedDate.format(new Date(`${entry.playedOn}T00:00:00Z`))
                  : "-"}
              </span>
              {entry.startedAt && (
                <span>
                  <Clock3 size={13} /> {formatEntryTime(entry.startedAt, lang)}
                </span>
              )}
              {entry.minutes ? (
                <span>
                  <Clock3 size={13} /> {entry.minutes} min
                </span>
              ) : null}
              {entry.marksStart && (
                <span
                  className="journey-milestone-badge"
                  data-milestone="start"
                >
                  <Play size={12} fill="currentColor" />{" "}
                  {tri(lang, "Começou", "Started", "Empezó")}
                </span>
              )}
              {entry.marksFinish && (
                <span
                  className="journey-milestone-badge"
                  data-milestone="finish"
                >
                  <Flag size={12} fill="currentColor" />{" "}
                  {tri(lang, "Terminou", "Finished", "Terminó")}
                </span>
              )}
              {entry.journeyTitle && entry.journeyPublicId && (
                <Link
                  className="activity-journey-button"
                  href={`/${lang}/journal/${entry.journeyPublicId}`}
                >
                  <Map size={13} />
                  {entry.journeyTitle}
                </Link>
              )}
            </div>
          )}
          {entry.content && entry.kind === "review" && (
            <ReviewMarkdownPreview
              content={entry.content}
              spoilers={entry.spoilers}
              lang={lang}
            />
          )}
          {/* Same restricted markdown as a review body, so an image or link in a
            journal note renders instead of showing as raw text. */}
          {entry.content && entry.kind === "diary" && (
            <ReviewMarkdownPreview
              content={entry.content}
              spoilers={entry.spoilers}
              lang={lang}
            />
          )}
          {entry.kind === "diary" &&
            entry.images &&
            entry.images.length > 0 && (
              <JournalGallery
                images={entry.images}
                lang={lang}
                spoilers={entry.spoilers}
                className="activity-journal-gallery"
              />
            )}
          {entry.kind === "review" &&
            entry.aspects &&
            entry.aspects.length > 0 && (
              <dl className="activity-aspects">
                {entry.aspects.map((aspect) => (
                  <div key={aspect.label}>
                    <dt>{aspect.label}</dt>
                    <dd>{aspect.rating}</dd>
                  </div>
                ))}
              </dl>
            )}
          <div className="activity-entry-footer">
            <LikeButton
              contentType={entry.kind}
              contentId={entry.id}
              count={entry.likes ?? 0}
              liked={Boolean(entry.likedByViewer)}
              canLike={Boolean(viewerId)}
              lang={lang}
            />
            {entry.kind === "review" && (
              <Link
                className="activity-read-more"
                href={`/${lang}/review/${entry.publicId ?? entry.id}`}
              >
                {tri(
                  lang,
                  "Ver avaliação completa",
                  "View full review",
                  "Ver reseña completa",
                )}
              </Link>
            )}
            {entry.kind === "screenshot" && (
              <Link
                className="activity-read-more"
                href={`/${lang}/shot/${entry.publicId ?? entry.id}`}
              >
                {tri(lang, "Ver captura", "View screenshot", "Ver captura")}
              </Link>
            )}
            {entry.kind === "diary" && entry.publicId && (
              <Link
                className="activity-read-more"
                href={`/${lang}/entry/${entry.publicId}`}
              >
                {tri(lang, "Ver sessão", "View session", "Ver sesión")}
              </Link>
            )}
            {viewerId === entry.profileId && entry.kind !== "screenshot" && (
              <ActivityEntryActions entry={entry} lang={lang} />
            )}
          </div>
        </div>
      </article>
    </Reveal>
  ));
  // One request for every author in the stream, wrapped around whichever
  // container the caller asked for.
  const authorIds = entries.map((entry) => entry.profileId);
  if (carousel)
    return (
      <StreamLevelProvider profileIds={authorIds}>
        <ShelfCarousel
          label={carousel.label}
          lang={lang}
          autoPlay={carousel.autoPlay}
          className={carousel.className ?? ""}
        >
          {items}
        </ShelfCarousel>
      </StreamLevelProvider>
    );
  return (
    <StreamLevelProvider profileIds={authorIds}>
      <div className="activity-stream" data-display={display}>
        {items}
      </div>
    </StreamLevelProvider>
  );
}

function formatActivityRating(
  rating: number,
  mode: SocialEntry["ratingMode"],
  lang: UiLang,
) {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}
