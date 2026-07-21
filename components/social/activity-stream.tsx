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
import { ActivityEntryActions } from "./activity-entry-actions";
import { LikeButton } from "./like-button";
import { VerifiedBadge } from "../verified-badge";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  JourneyDetailsDialog,
  type JourneyDetailSession,
} from "./journey-details-dialog";

export type SocialEntry = {
  id: string;
  kind: "review" | "diary";
  profileId: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
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
  playedOn?: string;
  endedOn?: string | null;
  minutes?: number | null;
  marksStart?: boolean;
  marksFinish?: boolean;
  journeyId?: string | null;
  journeyTitle?: string | null;
  journeySessions?: JourneyDetailSession[];
  spoilers: boolean;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  createdAt: string;
  updatedAt?: string;
  likes?: number;
  likedByViewer?: boolean;
};

export function ActivityStream({
  entries,
  lang,
  viewerId,
}: {
  entries: SocialEntry[];
  lang: UiLang;
  viewerId?: string | null;
}) {
  const t = uiText(lang);
  const date = new Intl.DateTimeFormat(lang, {
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
  return (
    <div className="activity-stream">
      {entries.map((entry) => (
        <article
          className="activity-entry"
          data-kind={entry.kind}
          key={`${entry.kind}-${entry.id}`}
        >
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
                      {entry.profile.display_name ||
                        `@${entry.profile.username}`}
                    </Link>
                    {entry.profile.verified && <VerifiedBadge lang={lang} />}
                  </strong>
                  <Link href={`/${lang}/u/${entry.profile.username}`}>
                    <small>@{entry.profile.username}</small>
                  </Link>
                </span>
              </div>
              <time dateTime={entry.createdAt}>
                {date.format(new Date(entry.createdAt))}
                {entry.updatedAt &&
                  new Date(entry.updatedAt).getTime() -
                    new Date(entry.createdAt).getTime() >
                    1000 && (
                    <small className="activity-edited">
                      {" "}
                      · {tri(lang, "editada", "edited", "editada")}
                    </small>
                  )}
              </time>
            </header>
            <p className="activity-verb">
              {entry.kind === "review"
                ? tri(lang, "avaliou", "reviewed", "reseñó")
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
                <Link href={`/${lang}/review/${entry.id}`}>{entry.title}</Link>
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
                  {entry.journeyTitle && (
                    <JourneyDetailsDialog
                      title={entry.journeyTitle}
                      gameName={entry.game?.name ?? entry.gameSlug}
                      sessions={entry.journeySessions ?? []}
                      lang={lang}
                    />
                  )}
                </div>
              )}
            {entry.kind === "diary" && (
              <div className="activity-meta">
                <span>
                  <CalendarDays size={13} />{" "}
                  {entry.playedOn
                    ? entry.endedOn
                      ? `${date.format(new Date(`${entry.playedOn}T00:00:00Z`))} – ${date.format(new Date(`${entry.endedOn}T00:00:00Z`))}`
                      : date.format(new Date(`${entry.playedOn}T00:00:00Z`))
                    : "—"}
                </span>
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
                {entry.journeyTitle && (
                  <span className="activity-journey-chip">
                    <Map size={13} /> {entry.journeyTitle}
                  </span>
                )}
              </div>
            )}
            {entry.content &&
              (entry.spoilers ? (
                <details className="spoiler-content">
                  <summary>
                    <EyeOff size={14} />{" "}
                    {tri(
                      lang,
                      "Mostrar conteúdo com spoilers",
                      "Show spoiler content",
                      "Mostrar contenido con spoilers",
                    )}
                  </summary>
                  <p>{entry.content}</p>
                </details>
              ) : (
                <p className="activity-content">{entry.content}</p>
              ))}
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
                canLike={Boolean(viewerId) && viewerId !== entry.profileId}
                lang={lang}
              />
              {entry.kind === "review" && (
                <Link
                  className="activity-read-more"
                  href={`/${lang}/review/${entry.id}`}
                >
                  {tri(
                    lang,
                    "Ver avaliação completa",
                    "View full review",
                    "Ver reseña completa",
                  )}
                </Link>
              )}
              {viewerId === entry.profileId && (
                <ActivityEntryActions entry={entry} lang={lang} />
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
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
