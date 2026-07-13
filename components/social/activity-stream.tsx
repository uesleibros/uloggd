import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, EyeOff, Star } from "lucide-react";
import type { Game } from "@/lib/igdb";
import { ActivityEntryActions } from "./activity-entry-actions";

export type SocialEntry = {
  id: string;
  kind: "review" | "diary";
  profileId: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  igdbId: number;
  gameSlug: string;
  game: Game | null;
  rating?: number;
  content?: string | null;
  playedOn?: string;
  minutes?: number | null;
  spoilers: boolean;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  createdAt: string;
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
        <article className="activity-entry" key={`${entry.kind}-${entry.id}`}>
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
              <Link
                href={`/${lang}/u/${entry.profile.username}`}
                className="activity-user"
              >
                <span className="activity-avatar">
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
                </span>
                <span>
                  <strong>
                    {entry.profile.display_name || `@${entry.profile.username}`}
                  </strong>
                  <small>@{entry.profile.username}</small>
                </span>
              </Link>
              <time dateTime={entry.createdAt}>
                {date.format(new Date(entry.createdAt))}
              </time>
            </header>
            <p className="activity-verb">
              {entry.kind === "review"
                ? pt
                  ? "avaliou"
                  : "reviewed"
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
                aria-label={`${entry.rating / 20} / 5`}
              >
                <Star size={14} fill="currentColor" />{" "}
                {(entry.rating / 20).toLocaleString(lang)}
              </div>
            )}
            {entry.kind === "diary" && (
              <div className="activity-meta">
                <span>
                  <CalendarDays size={13} />{" "}
                  {entry.playedOn
                    ? date.format(new Date(`${entry.playedOn}T00:00:00Z`))
                    : "—"}
                </span>
                {entry.minutes ? (
                  <span>
                    <Clock3 size={13} /> {entry.minutes} min
                  </span>
                ) : null}
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
            {viewerId === entry.profileId && (
              <ActivityEntryActions
                id={entry.id}
                kind={entry.kind}
                lang={lang}
                gameSlug={entry.gameSlug}
                playedOn={entry.playedOn}
                minutes={entry.minutes}
                content={entry.content}
                spoilers={entry.spoilers}
                visibility={entry.visibility}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
