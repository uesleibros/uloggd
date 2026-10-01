"use client";

import Image from "next/image";
import { playtime } from "@/lib/playtime";
import Link from "next/link";
import { CalendarDays, Clock3, Flag, Repeat, Trophy } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { LoadError } from "@/components/ui/load-error";
import { ArchiveStreamSkeleton } from "@/components/social/workspace-body-skeletons";
import { tri, type UiLang } from "@/lib/ui-text";
import { isJourneyStatus, journeyStatusLabel } from "@/lib/game-status";

type JourneyRow = {
  id: string;
  public_id: string;
  igdb_id: number;
  game_slug: string;
  title: string;
  status: string | null;
  started_on: string | null;
  finished_on: string | null;
  replay: boolean | null;
  mastered: boolean | null;
  progress: string | null;
  minutes: string | number;
  sessions: string | number;
  last_played: string | null;
};

type CatalogGame = {
  id: number;
  slug: string;
  name: string;
  cover_url: string;
  release_year: number | null;
};

/**
 * Somebody's playthroughs, as a list.
 *
 * The archive beside this shows what a person wrote and the days they logged.
 * A run is the thing those days belong to, and it was readable only from the
 * game it was of: this is the same archive asked the third way.
 *
 * What a stranger sees is what the database lets them: a run with nothing
 * public in it is not here, and the hours are the hours of the sessions they
 * are allowed to read.
 */
export function ProfileJourneys({
  username,
  lang,
}: {
  username: string;
  lang: UiLang;
}) {
  const answer = useApi<{ data: JourneyRow[]; games: CatalogGame[] }>(
    `/profiles/${encodeURIComponent(username)}/journeys?limit=24`,
    { keepPrevious: true },
  );
  const rows = answer.payload?.data ?? [];
  const games = new Map(
    (answer.payload?.games ?? []).map((game) => [game.id, game]),
  );

  if (answer.error && !answer.payload)
    return (
      <LoadError
        lang={lang}
        onRetry={answer.reload}
        what={tri(lang, "as jornadas", "these runs", "los recorridos")}
      />
    );
  if (answer.loading && !answer.payload) return <ArchiveStreamSkeleton />;
  if (!rows.length && !answer.error && !answer.loading)
    return (
      <p className="profile-journeys-empty">
        {tri(
          lang,
          "Nenhuma jornada por aqui ainda.",
          "No runs here yet.",
          "Ningún recorrido por aquí todavía.",
        )}
      </p>
    );

  return (
    <>
      {answer.error != null && (
        <LoadError
          lang={lang}
          onRetry={answer.reload}
          what={tri(lang, "as jornadas", "these runs", "los recorridos")}
        />
      )}
      <div className="pending-region" data-stale={answer.stale || undefined}>
        <ol className="profile-journeys">
          {rows.map((run) => {
            const game = games.get(Number(run.igdb_id));
            const minutes = Number(run.minutes) || 0;
            const sessions = Number(run.sessions) || 0;
            const status = isJourneyStatus(run.status) ? run.status : null;
            return (
              <li key={run.id}>
                <Link href={`/${lang}/journal/${run.public_id}`}>
                  <span className="profile-journey-cover">
                    {game?.cover_url && (
                      <Image src={game.cover_url} alt="" fill sizes="64px" />
                    )}
                  </span>
                  <span className="profile-journey-text">
                    <strong>{run.title}</strong>
                    <small>{game?.name ?? run.game_slug}</small>
                    <span className="profile-journey-facts">
                      {status && (
                        <b data-status={status}>
                          {journeyStatusLabel(status, lang)}
                        </b>
                      )}
                      {sessions > 0 && (
                        <span>
                          <CalendarDays size={12} aria-hidden />
                          {tri(
                            lang,
                            `${sessions} ${sessions === 1 ? "sessão" : "sessões"}`,
                            `${sessions} ${sessions === 1 ? "session" : "sessions"}`,
                            `${sessions} ${sessions === 1 ? "sesión" : "sesiones"}`,
                          )}
                        </span>
                      )}
                      {minutes > 0 && (
                        <span>
                          <Clock3 size={12} aria-hidden />
                          {playtime(minutes)}
                        </span>
                      )}
                      {run.replay && (
                        <span>
                          <Repeat size={12} aria-hidden />
                          {tri(lang, "Rejogada", "Replay", "Rejugada")}
                        </span>
                      )}
                      {run.mastered && (
                        <span>
                          <Trophy size={12} aria-hidden />
                          {tri(lang, "Dominada", "Mastered", "Dominada")}
                        </span>
                      )}
                      {run.progress && (
                        <span>
                          <Flag size={12} aria-hidden />
                          {run.progress}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
