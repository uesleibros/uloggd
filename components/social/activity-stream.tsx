import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Clock3,
  EyeOff,
  Flag,
  Play,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type { Game } from "@/lib/igdb";
import { ActivityEntryActions } from "./activity-entry-actions";
import { LikeButton } from "./like-button";
import { VerifiedBadge } from "../verified-badge";

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
  lang: "pt-BR" | "en";
  viewerId?: string | null;
}) {
  const pt = lang === "pt-BR";
  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (!entries.length)
    return (
      <div className="social-empty">
        <h2>{pt ? "Nada registrado ainda" : "Nothing logged yet"}</h2>
        <p>
          {pt
            ? "Avaliações e sessões públicas aparecerão aqui."
            : "Public reviews and sessions will appear here."}
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
                      · {pt ? "editada" : "edited"}
                    </small>
                  )}
              </time>
            </header>
            <p className="activity-verb">
              {entry.kind === "review"
                ? pt
                  ? "avaliou"
                  : "reviewed"
                : entry.endedOn
                  ? pt
                    ? "registrou uma jornada em"
                    : "logged a journey in"
                  : pt
                    ? "registrou uma sessão de"
                    : "logged a session of"}{" "}
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
                    ? pt
                      ? "Recomendo"
                      : "Recommended"
                    : pt
                      ? "Não recomendo"
                      : "Not recommended"
                  : formatActivityRating(entry.rating, entry.ratingMode, lang)}
              </div>
            )}
            {entry.kind === "review" && entry.title && (
              <h3 className="activity-review-title">
                <Link href={`/${lang}/review/${entry.id}`}>{entry.title}</Link>
              </h3>
            )}
            {entry.kind === "review" &&
              (entry.mastered || entry.replay || entry.platform) && (
                <div className="activity-meta activity-review-meta">
                  {entry.mastered && (
                    <span>
                      <Trophy size={13} /> {pt ? "Dominado" : "Mastered"}
                    </span>
                  )}
                  {entry.replay && <span>{pt ? "Rejogada" : "Replay"}</span>}
                  {entry.platform && <span>{entry.platform}</span>}
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
                  <span className="journey-milestone-badge" data-milestone="start">
                    <Play size={12} fill="currentColor" />{" "}
                    {pt ? "Começou" : "Started"}
                  </span>
                )}
                {entry.marksFinish && (
                  <span
                    className="journey-milestone-badge"
                    data-milestone="finish"
                  >
                    <Flag size={12} fill="currentColor" />{" "}
                    {pt ? "Terminou" : "Finished"}
                  </span>
                )}
              </div>
            )}
            {entry.content &&
              (entry.spoilers ? (
                <details className="spoiler-content">
                  <summary>
                    <EyeOff size={14} />{" "}
                    {pt
                      ? "Mostrar conteúdo com spoilers"
                      : "Show spoiler content"}
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
            {entry.kind === "review" && (
              <Link
                className="activity-read-more"
                href={`/${lang}/review/${entry.id}`}
              >
                {pt ? "Ver avaliação completa" : "View full review"}
              </Link>
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
  lang: "pt-BR" | "en",
) {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10")
    return `${(rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
}
