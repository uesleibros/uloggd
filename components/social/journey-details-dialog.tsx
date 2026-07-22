"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Clock3, Flag, Map, Play, X } from "lucide-react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { RelativeTime } from "@/components/relative-time";

export type JourneyDetailSession = {
  id: string;
  playedOn: string;
  endedOn: string | null;
  minutes: number | null;
  note: string | null;
  marksStart: boolean;
  marksFinish: boolean;
};

export function JourneyDetailsDialog({
  title,
  gameName,
  sessions,
  lang,
}: {
  title: string;
  gameName: string;
  sessions: JourneyDetailSession[];
  lang: UiLang;
}) {
  const t = uiText(lang);
  const totalMinutes = sessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="activity-journey-button" type="button">
          <Map size={13} />
          {tri(lang, "Ver jornada", "View journey", "Ver recorrido")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="journey-details-overlay" />
        <Dialog.Content className="journey-details-dialog">
          <header>
            <div>
              <span>
                {tri(
                  lang,
                  "JORNADA LIGADA",
                  "LINKED JOURNEY",
                  "RECORRIDO VINCULADO",
                )}
              </span>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{gameName}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="journey-details-summary">
            <span>
              <CalendarDays size={14} />
              <strong>{sessions.length}</strong>{" "}
              {sessions.length === 1
                ? tri(lang, "sessão", "session", "sesión")
                : tri(lang, "sessões", "sessions", "sesiones")}
            </span>
            {totalMinutes > 0 && (
              <span>
                <Clock3 size={14} />
                <strong>{formatMinutes(totalMinutes)}</strong>
              </span>
            )}
          </div>
          <div className="journey-details-scroll">
            {sessions.length ? (
              sessions.map((session) => (
                <article key={session.id}>
                  <div>
                    <span>
                      <RelativeTime
                        value={`${session.playedOn}T00:00:00Z`}
                        lang={lang}
                      />
                      {session.endedOn && (
                        <>
                          {" "}
                          –{" "}
                          <RelativeTime
                            value={`${session.endedOn}T00:00:00Z`}
                            lang={lang}
                          />
                        </>
                      )}
                    </span>
                    {session.minutes ? (
                      <span>{formatMinutes(session.minutes)}</span>
                    ) : null}
                  </div>
                  {(session.marksStart || session.marksFinish) && (
                    <div className="journey-details-milestones">
                      {session.marksStart && (
                        <span>
                          <Play size={11} fill="currentColor" />
                          {tri(lang, "Início", "Start", "Inicio")}
                        </span>
                      )}
                      {session.marksFinish && (
                        <span>
                          <Flag size={11} fill="currentColor" />
                          {tri(lang, "Fim", "Finish", "Fin")}
                        </span>
                      )}
                    </div>
                  )}
                  {session.note && <p>{session.note}</p>}
                </article>
              ))
            ) : (
              <div className="journey-details-empty">
                <Map size={22} />
                <p>
                  {tri(
                    lang,
                    "Esta jornada ainda não tem sessões visíveis.",
                    "This journey has no visible sessions yet.",
                    "Este recorrido todavía no tiene sesiones visibles.",
                  )}
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}min`;
}
