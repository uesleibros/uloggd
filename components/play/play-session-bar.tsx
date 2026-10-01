"use client";

import * as Dialog from "@/components/ui/dialog";
import { playtimeClock } from "@/lib/playtime";
import { Checkbox } from "@/components/ui/checkbox";
import { SafeImage } from "@/components/safe-image";
import { PlaySessionShot } from "./play-session-shot";
import {
  Check,
  Flag,
  LoaderCircle,
  MapPin,
  Pencil,
  Square,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, isReadAccessFailure, settle } from "@/lib/api-client";
import { LoadError } from "@/components/ui/load-error";
import {
  announcePlaySession,
  broadcastPlaySession,
  elapsedMinutes,
  PLAY_SESSION_EVENT,
  PLAY_SESSION_STORAGE,
  type OpenSession,
  type PlayEvent,
} from "@/lib/play-session";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { requestXpRefresh } from "@/lib/xp-feedback";

/**
 * The one session somebody has open, wherever they are on the site.
 *
 * It lives in the layout, so it survives navigation: the clock is not
 * restarted by walking from the game page to somebody's profile, and what was
 * half typed into it is still there. Small on purpose. A session that is
 * running is a fact to keep in the corner of the eye, not a page.
 */
export function PlaySessionBar({
  lang,
  signedIn,
}: {
  lang: UiLang;
  signedIn: boolean;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [session, setSession] = useState<OpenSession | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<"NOTE" | "PROGRESS" | "STOP">("NOTE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * What the closing dialog is about, or nothing.
   *
   * It holds its own copy rather than reading the session: ending one clears
   * the session, and a dialog that read it would lose its title and unmount
   * itself halfway through its own closing animation.
   */
  const [closing, setClosing] = useState<{
    id: string;
    title: string;
    empty: boolean;
  } | null>(null);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const field = useRef<HTMLInputElement | null>(null);
  const readGeneration = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const [readError, setReadError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    const reload = () => {
      const generation = ++readGeneration.current;
      readController.current?.abort();
      const controller = new AbortController();
      readController.current = controller;
      void api
        .get<{ data: OpenSession | null }>(
          "/journal/sessions",
          controller.signal,
        )
        .then((answer) => {
          if (
            !live ||
            controller.signal.aborted ||
            generation !== readGeneration.current
          )
            return;
          // The clock is read as the session arrives rather than in an effect
          // afterwards: a page left open for an hour before a session started
          // would otherwise count from when the page loaded.
          setNow(Date.now());
          setSession(answer.data);
          setReadError(false);
        })
        .catch((failure) => {
          if (
            !live ||
            controller.signal.aborted ||
            generation !== readGeneration.current
          )
            return;
          if (isReadAccessFailure(failure)) setSession(null);
          setReadError(true);
        });
    };
    reload();
    const visible = () => {
      if (document.visibilityState === "visible") reload();
    };
    const changed = (event: StorageEvent) => {
      if (event.key === PLAY_SESSION_STORAGE) reload();
    };
    window.addEventListener("online", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false;
      readController.current?.abort();
      window.removeEventListener("online", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [signedIn, readAttempt]);

  useEffect(() => {
    function heard(event: Event) {
      readGeneration.current += 1;
      readController.current?.abort();
      setNow(Date.now());
      setSession((event as CustomEvent<OpenSession | null>).detail);
      setOpen(false);
      setDraft("");
      setError(null);
      setReadError(false);
    }
    window.addEventListener(PLAY_SESSION_EVENT, heard);
    return () => window.removeEventListener(PLAY_SESSION_EVENT, heard);
  }, []);

  // Half a minute is as often as a minute counter can change, and the tick
  // only runs while something is being counted.
  useEffect(() => {
    if (!session) return;
    const tick = window.setInterval(() => setNow(Date.now()), 30000);
    const wake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [session]);

  const addEvent = useCallback(
    async (text: string, as: "NOTE" | "PROGRESS" | "STOP") => {
      if (!session || !text.trim() || pending) return;
      readGeneration.current += 1;
      readController.current?.abort();
      setPending(true);
      setError(null);
      const { data, error: failure } = await settle(
        api.post<{ data: PlayEvent }>(
          `/journal/sessions/${session.id}/events`,
          {
            kind: as,
            // PROGRESS is a place, so it travels in `marker`; a note and a
            // stop are sentences, so they travel in `body`.
            ...(as === "PROGRESS"
              ? { marker: text.trim().slice(0, 80) }
              : { body: text.trim().slice(0, 500) }),
          },
        ),
      );
      setPending(false);
      if (failure || !data) {
        setError(
          tri(
            lang,
            "Não deu para anotar agora.",
            "That could not be noted right now.",
            "No se pudo anotar ahora.",
          ),
        );
        return;
      }
      setDraft("");
      readGeneration.current += 1;
      setSession((previous) =>
        previous?.id === session.id
          ? {
              ...previous,
              events: previous.events.some((event) => event.id === data.id)
                ? previous.events
                : [...previous.events, data],
            }
          : previous,
      );
      broadcastPlaySession();
      field.current?.focus();
    },
    [lang, pending, session],
  );

  if (!signedIn) return null;

  const current = session;
  const elapsed = current ? elapsedMinutes(current.open_since, now) : 0;
  const last = current?.events[current.events.length - 1] ?? null;
  const title = current
    ? (current.game?.name ??
      current.game_slug
        .replace(/-/g, " ")
        .replace(/^./, (one) => one.toUpperCase()))
    : "";

  async function finish() {
    if (pending || !closing) return;
    setPending(true);
    setError(null);
    const typed = minutes.trim();
    const { data, error: failure } = await settle(
      api.patch<{ data: { public_id: string } }>(
        `/journal/sessions/${closing.id}`,
        {
          ...(typed ? { minutes: Math.max(0, Math.round(Number(typed))) } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(finished ? { marks_finish: true } : {}),
        },
      ),
    );
    setPending(false);
    if (failure || !data) {
      setError(
        tri(
          lang,
          "Não deu para encerrar agora.",
          "That could not be closed right now.",
          "No se pudo cerrar ahora.",
        ),
      );
      return;
    }
    setClosing(null);
    setMinutes("");
    setNote("");
    setFinished(false);
    // As one transition: the bar goes away and the pages behind it are asked
    // to redraw in the same commit, rather than the second landing inside
    // React's work for the first.
    startTransition(() => {
      announcePlaySession(null);
      router.refresh();
    });
    requestXpRefresh();
  }

  async function discard() {
    if (pending || !closing) return;
    setPending(true);
    const { error: failure } = await settle(
      api.delete<{ data: unknown }>(`/journal/sessions/${closing.id}`),
    );
    setPending(false);
    if (failure) {
      setError(
        tri(
          lang,
          "Não deu para descartar agora.",
          "That could not be discarded right now.",
          "No se pudo descartar ahora.",
        ),
      );
      return;
    }
    setClosing(null);
    startTransition(() => {
      announcePlaySession(null);
      router.refresh();
    });
  }

  return (
    <>
      {readError && !current && (
        <section className="play-bar play-bar-read-error">
          <LoadError
            lang={lang}
            onRetry={() => setReadAttempt((value) => value + 1)}
            what={tri(
              lang,
              "a sessão aberta",
              "the open session",
              "la sesión abierta",
            )}
          />
        </section>
      )}
      {current && (
        <section
          className="play-bar"
          data-open={open ? "" : undefined}
          aria-label={tri(
            lang,
            "Sessão aberta",
            "Open session",
            "Sesión abierta",
          )}
        >
          <div className="play-bar-head">
            <span className="play-bar-pulse" aria-hidden />
            {current.game && (
              <Link
                className="play-bar-cover"
                href={`/${lang}/game/${current.game.slug}`}
              >
                <SafeImage
                  src={current.game.cover_url}
                  alt=""
                  width={28}
                  height={38}
                  sizes="28px"
                />
              </Link>
            )}
            <button
              type="button"
              className="play-bar-identity"
              onClick={() => setOpen((was) => !was)}
              aria-expanded={open}
            >
              <strong>{title}</strong>
              <span>
                {playtimeClock(elapsed)}
                {last && (
                  <>
                    {" · "}
                    <span className="play-bar-last">
                      {last.kind === "PROGRESS" ? last.marker : last.body}
                    </span>
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              className="play-bar-stop"
              onClick={() => {
                setMinutes(String(elapsed));
                setClosing({
                  id: current.id,
                  title,
                  empty: current.events.length === 0,
                });
              }}
            >
              <Square size={13} fill="currentColor" aria-hidden />
              <span>{tri(lang, "Encerrar", "Finish", "Terminar")}</span>
            </button>
          </div>
          {readError && (
            <LoadError
              lang={lang}
              onRetry={() => setReadAttempt((value) => value + 1)}
              what={tri(
                lang,
                "a sessão aberta",
                "the open session",
                "la sesión abierta",
              )}
            />
          )}
          {open && (
            <div className="play-bar-body">
              {current.resume && (
                <p className="play-bar-resume">
                  <Flag size={12} aria-hidden />
                  {tri(lang, "Você parou:", "You stopped:", "Paraste:")}{" "}
                  <span>{current.resume}</span>
                </p>
              )}
              <form
                className="play-bar-add"
                onSubmit={(submit) => {
                  submit.preventDefault();
                  void addEvent(draft, kind);
                }}
              >
                <div className="play-bar-kinds" role="group">
                  <button
                    type="button"
                    data-on={kind === "NOTE" ? "" : undefined}
                    aria-pressed={kind === "NOTE"}
                    onClick={() => setKind("NOTE")}
                    aria-label={tri(lang, "Anotação", "Note", "Nota")}
                  >
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button
                    type="button"
                    data-on={kind === "PROGRESS" ? "" : undefined}
                    aria-pressed={kind === "PROGRESS"}
                    onClick={() => setKind("PROGRESS")}
                    aria-label={tri(
                      lang,
                      "Onde cheguei",
                      "Progress",
                      "Progreso",
                    )}
                  >
                    <MapPin size={13} aria-hidden />
                  </button>
                  {/* Where you stopped, which is the one that is worth
                      reading at the start of the next session rather than
                      at the end of this one. */}
                  <button
                    type="button"
                    data-on={kind === "STOP" ? "" : undefined}
                    aria-pressed={kind === "STOP"}
                    onClick={() => setKind("STOP")}
                    aria-label={tri(
                      lang,
                      "Parei aqui",
                      "Stopped here",
                      "Paré aquí",
                    )}
                  >
                    <Flag size={13} aria-hidden />
                  </button>
                  <PlaySessionShot
                    session={current}
                    lang={lang}
                    onAdded={(event) => {
                      readGeneration.current += 1;
                      setSession((was) =>
                        was?.id === current.id
                          ? {
                              ...was,
                              events: was.events.some(
                                (known) => known.id === event.id,
                              )
                                ? was.events
                                : [...was.events, event],
                            }
                          : was,
                      );
                      broadcastPlaySession();
                    }}
                    onFailed={setError}
                  />
                </div>
                <input
                  ref={field}
                  type="text"
                  value={draft}
                  maxLength={kind === "NOTE" ? 500 : 80}
                  onChange={(change) => setDraft(change.target.value)}
                  placeholder={
                    kind === "NOTE"
                      ? tri(
                          lang,
                          "O que aconteceu agora",
                          "What just happened",
                          "Qué acaba de pasar",
                        )
                      : kind === "STOP"
                        ? tri(
                            lang,
                            "Antes do chefe da torre",
                            "Before the tower boss",
                            "Antes del jefe de la torre",
                          )
                        : tri(
                            lang,
                            "Capítulo 4, 60%, derrotei o Ganon",
                            "Chapter 4, 60%, beat Ganon",
                            "Capítulo 4, 60%, vencí a Ganon",
                          )
                  }
                />
                <button type="submit" disabled={pending || !draft.trim()}>
                  {pending ? (
                    <LoaderCircle size={14} className="spin" aria-hidden />
                  ) : (
                    <Check size={14} aria-hidden />
                  )}
                  <span>{tri(lang, "Anotar", "Add", "Anotar")}</span>
                </button>
              </form>
              {current.events.length > 0 && (
                <ol className="play-bar-events">
                  {current.events.slice(-4).map((event) => (
                    <li key={event.id} data-kind={event.kind}>
                      <span className="play-bar-event-at">
                        {playtimeClock(
                          elapsedMinutes(
                            current.open_since,
                            new Date(event.at).getTime(),
                          ),
                        )}
                      </span>
                      <span>
                        {event.kind === "PROGRESS"
                          ? event.marker
                          : event.kind === "SHOT"
                            ? t.screenshot
                            : event.body}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {error && <p className="play-bar-error">{error}</p>}
            </div>
          )}
        </section>
      )}

      {/* Outside the bar, and never unmounted with it: ending a session clears
          the session, and a dialog torn out of the tree while it is still
          animating closed takes React with it. */}
      <Dialog.Root
        open={Boolean(closing)}
        onOpenChange={(next) => {
          if (!next && !pending) setClosing(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog play-close-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Encerrar a sessão",
                    "Finish the session",
                    "Terminar la sesión",
                  )}
                </Dialog.Title>
                <span>{closing?.title}</span>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <div className="social-editor-form">
              <label>
                <span>{tri(lang, "Minutos", "Minutes", "Minutos")}</span>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={minutes}
                  onChange={(change) => setMinutes(change.target.value)}
                />
                <small>
                  {tri(
                    lang,
                    "O relógio conta, você confirma. Em branco usa o tempo corrido.",
                    "The clock counts, you confirm. Blank uses the elapsed time.",
                    "El reloj cuenta, tú confirmas. En blanco usa el tiempo corrido.",
                  )}
                </small>
              </label>
              <label>
                <span>{tri(lang, "Como foi", "How it went", "Cómo fue")}</span>
                <textarea
                  rows={3}
                  value={note}
                  maxLength={5000}
                  onChange={(change) => setNote(change.target.value)}
                  placeholder={tri(
                    lang,
                    "Opcional. As anotações da sessão já estão salvas.",
                    "Optional. The session's notes are already saved.",
                    "Opcional. Las notas de la sesión ya están guardadas.",
                  )}
                />
              </label>
              <label className="play-close-finished">
                <Checkbox
                  checked={finished}
                  onCheckedChange={(next) => setFinished(Boolean(next))}
                />
                <span>
                  <Flag size={13} aria-hidden />
                  {tri(
                    lang,
                    "Terminei o jogo nesta sessão",
                    "I finished the game in this session",
                    "Terminé el juego en esta sesión",
                  )}
                </span>
              </label>
              {error && <p className="play-bar-error">{error}</p>}
              <footer className="play-close-actions">
                {closing?.empty && (
                  <button
                    type="button"
                    className="play-close-discard"
                    onClick={() => void discard()}
                    disabled={pending}
                  >
                    <Trash2 size={14} aria-hidden />
                    {tri(lang, "Descartar", "Discard", "Descartar")}
                  </button>
                )}
                <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                <button
                  type="button"
                  className="play-close-confirm"
                  onClick={() => void finish()}
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle size={14} className="spin" aria-hidden />
                  ) : (
                    <Check size={14} aria-hidden />
                  )}
                  {tri(lang, "Encerrar", "Finish", "Terminar")}
                </button>
              </footer>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
