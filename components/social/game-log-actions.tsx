"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Flag,
  ListPlus,
  LoaderCircle,
  Map,
  Pencil,
  ScanLine,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, settle } from "@/lib/api-client";
import Link from "next/link";
import { useState } from "react";
import { compareEntriesWithinDay } from "@/lib/journal-entry";
import { useLocalToday } from "@/components/use-local-today";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { requestXpRefresh } from "@/lib/xp-feedback";
import {
  formatSessionTime,
  JourneyCalendar,
  type JourneyOption,
  type JourneySession,
} from "./journey-calendar";
import { ReviewStudioForm, type ReviewFields } from "./review-studio-form";
import { ScreenshotStudioForm } from "./screenshot-studio-form";
import type { CommunityScope } from "./community-scope-select";
import { AddGameToListDialog } from "./add-game-to-list-dialog";
import { JourneyDaySheet, JourneyEntryEditor } from "./journey-day-editor";
import type { DayPayload, SaveOutcome } from "./journey-types";

type Mode = "review" | "diary" | "screenshot";
export type ReviewOption = {
  publicId: string;
  title: string | null;
  rating: number | null;
  ratingMode: "stars_5" | "level_5" | "score_10" | "score_100" | "recommend";
  recommended: boolean | null;
  createdAt: string;
  journeyTitle: string | null;
};
type SelectedJourney = string | "loose" | null;

/** A day removal is addressed by query, so it needs no body to travel. */
function removeDays(gameId: number, days: string[], journey: string | null) {
  const query = new URLSearchParams({
    igdb_id: String(gameId),
    days: days.join(","),
  });
  if (journey) query.set("journey_id", journey);
  return api.delete<{ data: unknown }>(`/journal/days?${query}`);
}

export function GameLogActions({
  game,
  platforms,
  lang,
  logCount,
  journeys = [],
  journeyOptions = [],
  reviews = [],
  initialMode = null,
  initialJourneyId = null,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: UiLang;
  logCount: number;
  journeys?: JourneySession[];
  journeyOptions?: JourneyOption[];
  reviews?: ReviewOption[];
  initialMode?: Mode | null;
  /**
   * Preselects a journey when arriving from its own page, so "log a session"
   * lands on the form already pointing at the journey being read rather than
   * at whichever one happens to be first.
   */
  initialJourneyId?: string | null;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [open, setOpen] = useState(Boolean(initialMode));
  const [pending, setPending] = useState(false);
  const today = useLocalToday();
  const [sessions, setSessions] = useState(journeys);
  const [journeyList, setJourneyList] = useState(journeyOptions);
  const [prevJourneys, setPrevJourneys] = useState(journeys);
  if (journeys !== prevJourneys) {
    setPrevJourneys(journeys);
    setSessions(journeys);
    setJourneyList(journeyOptions);
    setPending(false);
  }
  const hasLoose = sessions.some((session) => !session.journeyId);
  const [selectedJourney, setSelectedJourney] = useState<SelectedJourney>(
    // The one asked for, when it is real. A stale id in the URL falls back
    // rather than selecting nothing and leaving the form unusable.
    (initialJourneyId &&
      journeyOptions.find((option) => option.id === initialJourneyId)?.id) ||
      journeyOptions[0]?.id ||
      (hasLoose ? "loose" : null),
  );
  const [namingTitle, setNamingTitle] = useState("");
  const [naming, setNaming] = useState<"create" | "rename" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JourneyOption | null>(null);
  const [journeyDeleting, setJourneyDeleting] = useState(false);
  /**
   * Both studios open on a chooser and only then show the editor. Stacking the
   * full list and the editor in one scroll made the dialog long enough that the
   * form was off-screen, and it got worse with every journey or review added.
   * `step` is what "Trocar" walks back to.
   */
  const [step, setStep] = useState<"choose" | "work">("choose");
  // A day is a list of entries now, so opening one lands on the day sheet;
  // the single-entry editor is a second step from there.
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dayEditor, setDayEditor] = useState<{
    day: string;
    session: JourneySession | null;
  } | null>(null);
  const [openDayValue, setOpenDayValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeJourney =
    typeof selectedJourney === "string" && selectedJourney !== "loose"
      ? (journeyList.find((journey) => journey.id === selectedJourney) ?? null)
      : null;
  // A selection can outlive what it points at, a journey deleted in another
  // tab, or a create that failed server-side. Falling back keeps the editor
  // from silently writing sessions into a journey that is not there.
  const missingSelection =
    typeof selectedJourney === "string" &&
    selectedJourney !== "loose" &&
    !activeJourney;
  if (missingSelection)
    setSelectedJourney(journeyList[0]?.id ?? (hasLoose ? "loose" : null));
  const entryJourney = activeJourney?.id ?? null;
  const currentSessions = sessions.filter((session) =>
    selectedJourney === "loose"
      ? !session.journeyId
      : session.journeyId === entryJourney,
  );
  function sessionsFor(day: string) {
    return currentSessions
      .filter(
        (session) =>
          day >= session.start && day <= (session.end ?? session.start),
      )
      .sort(compareEntriesWithinDay);
  }

  async function performReview(
    fields: ReviewFields,
    commentsScope: CommunityScope,
  ) {
    setPending(true);
    const { error: rpcError } = await settle(
      api.post<{ data: unknown }>("/reviews", {
        igdb_id: game.id,
        game_slug: game.slug,
        comments_scope: commentsScope,
        ...fields,
      }),
    );
    if (!rpcError) {
      requestXpRefresh();
      router.refresh();
      window.setTimeout(() => setOpen(false), 420);
    }
    setPending(false);
    return !rpcError;
  }

  async function submitJourneyName() {
    const title = namingTitle.trim();
    if (!title || pending) return;
    setPending(true);
    setError(null);
    if (naming === "rename" && activeJourney) {
      const { error: rpcError } = await settle(
        api.patch<{ data: unknown }>(`/journal/journeys/${activeJourney.id}`, {
          title,
        }),
      );
      if (rpcError) {
        setError(
          tri(
            lang,
            "Não foi possível renomear.",
            "Could not rename.",
            "No se pudo renombrar.",
          ),
        );
      } else {
        setJourneyList((current) =>
          current.map((journey) =>
            journey.id === activeJourney.id ? { ...journey, title } : journey,
          ),
        );
        setNaming(null);
        setNamingTitle("");
        router.refresh();
      }
      setPending(false);
      return;
    }
    const { data: row, error: rpcError } = await settle(
      api.post<{ data: Record<string, unknown> }>("/journal/journeys", {
        igdb_id: game.id,
        game_slug: game.slug,
        title,
      }),
    );
    if (rpcError || !row?.id) {
      setError(
        tri(
          lang,
          "Não foi possível criar a jornada.",
          "Could not create journey.",
          "No se pudo crear el recorrido.",
        ),
      );
    } else {
      const created = {
        id: String(row.id),
        title: String(row.title ?? title),
        publicId: (row.public_id as string | null) ?? null,
      };
      setJourneyList((current) => [...current, created]);
      setSelectedJourney(created.id);
      setNaming(null);
      setNamingTitle("");
      setStep("work");
      requestXpRefresh();
      router.refresh();
    }
    setPending(false);
  }

  /**
   * Deletes a journey, and with it every session inside it.
   *
   * `diary_entries.journey_id` cascades, so this is not a rename or an
   * unlink: the sessions go too. It used to be armed by a first click on the
   * bin and confirmed by a second within four seconds, with the first click on
   * an unselected journey doing something else entirely, which is a lot of
   * writing to lose to a mistimed double-click. It asks now, and says how
   * much is going.
   */
  async function deleteJourney(target: JourneyOption) {
    if (pending) return;
    setJourneyDeleting(true);
    setPending(true);
    const { error: rpcError } = await settle(
      api.delete<{ data: unknown }>(`/journal/journeys/${target.id}`),
    );
    if (rpcError) {
      setError(
        tri(
          lang,
          "Não foi possível excluir.",
          "Could not delete.",
          "No se pudo eliminar.",
        ),
      );
      setJourneyDeleting(false);
      setPending(false);
      return;
    }
    setJourneyList((current) =>
      current.filter((journey) => journey.id !== target.id),
    );
    setSessions((current) =>
      current.filter((session) => session.journeyId !== target.id),
    );
    requestXpRefresh(false);
    if (selectedJourney === target.id) {
      const fallback =
        journeyList.find((journey) => journey.id !== target.id)?.id ??
        (hasLoose ? "loose" : null);
      setSelectedJourney(fallback);
      setStep("choose");
    }
    setJourneyDeleting(false);
    setPending(false);
    setDeleteTarget(null);
    router.refresh();
  }

  function showDay(day: string) {
    if (pending) return;
    setError(null);
    setDayEditor(null);
    setOpenDay(day);
  }

  function editEntry(day: string, session: JourneySession | null) {
    if (pending || session?.id.startsWith("temp-")) return;
    setError(null);
    setDayEditor({ day, session });
  }

  async function bulkAdd(days: string[]) {
    if (pending || selectedJourney === null) return;
    const fresh = days.filter((day) => !sessionsFor(day).length);
    if (!fresh.length) return;
    setError(null);
    setPending(true);
    setSessions((current) => [
      ...current,
      ...fresh.map((day) => ({
        id: `temp-${day}`,
        start: day,
        end: null,
        startedAt: null,
        createdAt: new Date().toISOString(),
        minutes: null,
        note: null,
        marksStart: false,
        marksFinish: false,
        spoilers: false,
        visibility: "PUBLIC" as const,
        commentsScope: "EVERYONE" as const,
        journeyId: entryJourney,
      })),
    ]);
    const { error: rpcError } = await settle(
      api.put<{ data: unknown }>("/journal/days", {
        igdb_id: game.id,
        game_slug: game.slug,
        days: fresh,
        journey_id: entryJourney,
      }),
    );
    if (rpcError) {
      setSessions(sessions);
      setPending(false);
      setError(t.couldNotSave);
    } else {
      requestXpRefresh();
      router.refresh();
    }
  }

  async function bulkRemove(days: string[]) {
    if (pending || selectedJourney === null) return;
    const daySet = new Set(days);
    const hit = (session: JourneySession) => {
      if (
        selectedJourney === "loose"
          ? session.journeyId
          : session.journeyId !== entryJourney
      )
        return false;
      for (const day of daySet) {
        if (day >= session.start && day <= (session.end ?? session.start))
          return true;
      }
      return false;
    };
    if (!sessions.some(hit)) return;
    setError(null);
    setPending(true);
    setSessions((current) => current.filter((session) => !hit(session)));
    const { error: rpcError } = await settle(
      removeDays(game.id, days, entryJourney),
    );
    if (rpcError) {
      setSessions(sessions);
      setPending(false);
      setError(t.couldNotRemove);
    } else {
      requestXpRefresh(false);
      router.refresh();
    }
  }

  /**
   * Clearing a whole day. Reusing the calendar's bulk delete means the day
   * sheet and a drag-erase remove exactly the same rows, so the two paths
   * cannot disagree about what "this day" covers.
   */
  async function removeWholeDay(day: string) {
    if (pending || !sessionsFor(day).length) return false;
    setError(null);
    setPending(true);
    const { error: rpcError } = await settle(
      removeDays(game.id, [day], entryJourney),
    );
    if (rpcError) {
      setPending(false);
      setError(t.couldNotRemove);
      return false;
    }
    setSessions((current) =>
      current.filter(
        (session) =>
          !(day >= session.start && day <= (session.end ?? session.start)) ||
          (selectedJourney === "loose"
            ? Boolean(session.journeyId)
            : session.journeyId !== entryJourney),
      ),
    );
    setOpenDay(null);
    requestXpRefresh(false);
    router.refresh();
    return true;
  }

  async function saveDay(
    payload: DayPayload,
    commitImages: (entryId: string) => Promise<boolean>,
  ): Promise<SaveOutcome> {
    if (!dayEditor) return "failed";
    setPending(true);
    const { session, day } = dayEditor;
    // The scope rides with the rest now, so a save is one call whether the
    // entry is new or not.
    const shared = {
      started_at: payload.time || null,
      minutes: payload.minutes,
      note: payload.note,
      contains_spoilers: payload.spoilers,
      visibility: payload.visibility,
      marks_start: payload.marksStart,
      marks_finish: payload.marksFinish,
      comments_scope: payload.commentsScope,
    };
    const { data, error: rpcError } = await settle(
      session
        ? api.patch<{ data: Record<string, unknown> }>(
            `/journal/entries/${session.id}`,
            { played_on: session.start, ended_on: session.end, ...shared },
          )
        : api.post<{ data: Record<string, unknown> }>("/journal/entries", {
            igdb_id: game.id,
            game_slug: game.slug,
            played_on: day,
            journey_id: entryJourney,
            ...shared,
          }),
    );
    if (rpcError) {
      setPending(false);
      return "failed";
    }
    if (!session) requestXpRefresh();
    const entryId = session?.id ?? data?.id;
    if (typeof entryId === "string") {
      // Images can only be attached once the entry exists, so they are the last
      // step. The entry itself is already saved at this point, so a failure
      // here is reported as an image failure, saying the session could not be
      // saved would send the author back to rewrite a note that is safely
      // stored.
      if (!(await commitImages(entryId))) {
        setPending(false);
        router.refresh();
        return "images";
      }
    }
    setDayEditor(null);
    requestXpRefresh(false);
    router.refresh();
    return "saved";
  }

  async function removeDay() {
    if (!dayEditor?.session) return false;
    setPending(true);
    const { error: rpcError } = await settle(
      api.delete<{ data: unknown }>(`/journal/entries/${dayEditor.session.id}`),
    );
    if (rpcError) {
      setPending(false);
      return false;
    }
    setDayEditor(null);
    requestXpRefresh(false);
    router.refresh();
    return true;
  }

  const labels = {
    review: tri(lang, "Nova avaliação", "New review", "Nueva reseña"),
    // Plural, because the panel under it lists every journey of the game.
    // It said "Sua jornada" over a chooser headed "Suas jornadas".
    diary: tri(lang, "Suas jornadas", "Your journeys", "Tus recorridos"),
    list: tri(lang, "Adicionar à lista", "Add to list", "Añadir a la lista"),
    screenshot: tri(lang, "Nova captura", "New screenshot", "Nueva captura"),
  };
  function openMode(nextMode: Mode) {
    setError(null);
    setStep("choose");
    setOpenDay(null);
    setDayEditor(null);
    setNaming(null);
    setNamingTitle("");
    setMode(nextMode);
    setOpen(true);
  }

  const namingOpen = naming !== null || selectedJourney === null;
  const journeyLabel =
    activeJourney?.title ??
    tri(lang, "Sessões avulsas", "Loose sessions", "Sesiones sueltas");
  const journeyMinutes = currentSessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const journeyDays = new Set(currentSessions.map((session) => session.start))
    .size;
  const sortedJourneySessions = [...currentSessions].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const journeyStarted =
    sortedJourneySessions.find((session) => session.marksStart)?.start ??
    sortedJourneySessions[0]?.start ??
    null;
  const journeyFinished =
    [...sortedJourneySessions].reverse().find((session) => session.marksFinish)
      ?.start ?? null;
  /**
   * A start or finish date, in a tile a fifth of the row wide.
   *
   * The year was always printed, and "26 de ago. de 2026" needs 123px in a
   * 120px tile: measured cut by three pixels at 1280, which is every session
   * logged this year. A date in the current year does not need to say which
   * year it is; one from another year still does.
   */
  const journeyDate = (value: string | null) => {
    if (!value) return "-";
    const when = new Date(`${value}T00:00:00Z`);
    const thisYear = when.getUTCFullYear() === new Date().getUTCFullYear();
    return new Intl.DateTimeFormat(lang, {
      day: "2-digit",
      month: "short",
      ...(thisYear ? {} : { year: "numeric" }),
      timeZone: "UTC",
    }).format(when);
  };
  const reviewDate = new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const reviewScore = (review: ReviewOption) => {
    if (review.ratingMode === "recommend") {
      if (review.recommended === null) return null;
      return review.recommended
        ? tri(lang, "Recomenda", "Recommends", "Recomienda")
        : tri(lang, "Não recomenda", "Doesn't recommend", "No recomienda");
    }
    if (review.rating === null) return null;
    if (review.ratingMode === "score_100") return `${review.rating}/100`;
    if (review.ratingMode === "score_10")
      return `${(review.rating / 10).toLocaleString(lang, { maximumFractionDigits: 1 })}/10`;
    if (review.ratingMode === "level_5")
      return `${Math.round(review.rating / 20)}/5`;
    return `${(review.rating / 20).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`;
  };

  return (
    <>
      <div className="game-log-actions">
        <button type="button" onClick={() => openMode("review")}>
          <BookOpen size={15} /> {labels.review}
        </button>
        <button type="button" onClick={() => openMode("diary")}>
          <CalendarPlus size={15} />{" "}
          {tri(lang, "Registrar jornada", "Log journey", "Registrar recorrido")}
        </button>
        <button type="button" onClick={() => openMode("screenshot")}>
          <ScanLine size={15} /> {labels.screenshot}
        </button>
        {logCount > 0 && (
          <Link href={`/${lang}/game/${game.slug}/logs`}>
            {tri(
              lang,
              `Ver registros (${logCount})`,
              `View logs (${logCount})`,
              `Ver registros (${logCount})`,
            )}
          </Link>
        )}
        <AddGameToListDialog
          game={game}
          lang={lang}
          trigger={
            <button type="button">
              <ListPlus size={15} /> {labels.list}
            </button>
          }
        />
      </div>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className={`social-editor-dialog${mode === "review" ? " review-studio-dialog" : ""}${mode === "diary" ? " journey-studio-dialog" : ""}`}
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>{mode ? labels[mode] : ""}</span>
                <Dialog.Title>{game.name}</Dialog.Title>
              </div>
              {game.releaseYear && <time>{game.releaseYear}</time>}
              <Dialog.Close aria-label={t.close} disabled={pending}>
                <X size={19} />
              </Dialog.Close>
            </header>
            {mode === "review" && step === "choose" && (
              <div className="social-editor-form studio-choose-step">
                <section className="review-history-strip" data-standalone>
                  <header>
                    <div>
                      <strong>
                        {tri(
                          lang,
                          "Suas avaliações",
                          "Your reviews",
                          "Tus reseñas",
                        )}
                      </strong>
                      <small>
                        {tri(
                          lang,
                          "Cada publicação vira uma avaliação independente.",
                          "Each publication becomes a separate review.",
                          "Cada publicación se convierte en una reseña independiente.",
                        )}
                      </small>
                    </div>
                    <span>{reviews.length}</span>
                  </header>
                  <ul>
                    <li data-lead>
                      <button
                        type="button"
                        data-new
                        onClick={() => setStep("work")}
                      >
                        <Plus size={12} />
                        {tri(lang, "Nova", "New", "Nueva")}
                      </button>
                    </li>
                    {reviews.map((review) => {
                      const score = reviewScore(review);
                      return (
                        <li key={review.publicId}>
                          <Link
                            href={`/${lang}/review/${review.publicId}`}
                            onClick={() => setOpen(false)}
                          >
                            <div>
                              <strong>
                                {review.title ||
                                  tri(
                                    lang,
                                    "Avaliação sem título",
                                    "Untitled review",
                                    "Reseña sin título",
                                  )}
                              </strong>
                              <small>
                                {reviewDate.format(new Date(review.createdAt))}
                                {review.journeyTitle
                                  ? ` · ${review.journeyTitle}`
                                  : ""}
                              </small>
                            </div>
                            {score && (
                              <span>
                                {review.ratingMode === "recommend" ? (
                                  review.recommended ? (
                                    <Check size={11} />
                                  ) : (
                                    <X size={11} />
                                  )
                                ) : (
                                  <Star size={11} fill="currentColor" />
                                )}{" "}
                                {score}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <footer className="studio-choose-actions">
                  <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                  <button
                    type="button"
                    data-primary
                    onClick={() => setStep("work")}
                  >
                    <Plus size={14} />
                    {tri(
                      lang,
                      "Escrever nova avaliação",
                      "Write a new review",
                      "Escribir nueva reseña",
                    )}
                  </button>
                </footer>
              </div>
            )}
            {mode === "review" && step === "work" && (
              <>
                <div className="studio-step-bar">
                  <button type="button" onClick={() => setStep("choose")}>
                    <ArrowLeft size={14} />
                    {tri(
                      lang,
                      "Trocar avaliação",
                      "Switch review",
                      "Cambiar reseña",
                    )}
                  </button>
                  <span>
                    {tri(lang, "Nova avaliação", "New review", "Nueva reseña")}
                  </span>
                </div>
                <ReviewStudioForm
                  lang={lang}
                  platforms={platforms}
                  journeyOptions={journeyList}
                  draftKey={`uloggd:review-draft:${game.id}`}
                  submitLabel={tri(
                    lang,
                    "Publicar nova avaliação",
                    "Publish new review",
                    "Publicar nueva reseña",
                  )}
                  busyLabel={tri(
                    lang,
                    "Publicando…",
                    "Publishing…",
                    "Publicando…",
                  )}
                  successLabel={tri(
                    lang,
                    "Nova avaliação publicada.",
                    "New review published.",
                    "Nueva reseña publicada.",
                  )}
                  onPerform={performReview}
                />
              </>
            )}
            {mode === "screenshot" && (
              <ScreenshotStudioForm
                game={game}
                lang={lang}
                onCancel={() => setOpen(false)}
              />
            )}
            {mode === "diary" &&
              step === "choose" &&
              !openDay &&
              !dayEditor && (
                <div className="social-editor-form journey-editor">
                  {/* Mirrors the review history strip: every journey for this
                    game is listed with its own size, selected in place, and
                    deleted from its own row, the old pill row scrolled the
                    titles off screen and hid delete behind a selection. */}
                  <section
                    className="journey-history-strip"
                    aria-busy={pending || undefined}
                  >
                    <header>
                      <div>
                        <small>
                          {tri(
                            lang,
                            "Cada jornada é uma passagem pelo jogo.",
                            "Each journey is one playthrough.",
                            "Cada recorrido es una partida.",
                          )}
                        </small>
                      </div>
                      <span>{journeyList.length}</span>
                    </header>
                    <ul>
                      <li data-lead>
                        <button
                          type="button"
                          data-new
                          disabled={pending}
                          data-active={naming === "create" || undefined}
                          onClick={() => {
                            setNaming("create");
                            setNamingTitle("");
                          }}
                        >
                          <Plus size={12} />
                          {tri(lang, "Nova", "New", "Nueva")}
                        </button>
                      </li>
                      {journeyList.map((journey) => {
                        const count = sessions.filter(
                          (session) => session.journeyId === journey.id,
                        ).length;
                        const active = selectedJourney === journey.id;
                        return (
                          <li
                            key={journey.id}
                            data-active={active || undefined}
                          >
                            <button
                              type="button"
                              disabled={pending}
                              aria-pressed={active}
                              onClick={() => {
                                setSelectedJourney(journey.id);
                                setNaming(null);
                                setStep("work");
                              }}
                            >
                              <Map size={13} aria-hidden />
                              <span>
                                <strong>{journey.title}</strong>
                                <small>
                                  {tri(
                                    lang,
                                    `${count} ${count === 1 ? "registro" : "registros"}`,
                                    `${count} ${count === 1 ? "entry" : "entries"}`,
                                    `${count} ${count === 1 ? "registro" : "registros"}`,
                                  )}
                                </small>
                              </span>
                              {active && <Check size={13} aria-hidden />}
                            </button>
                            {/* Asks about the journey whose bin was pressed.
                                It used to act on whichever journey happened to
                                be selected, so the first press on any other
                                one silently selected it instead of deleting
                                anything. */}
                            <button
                              type="button"
                              data-delete
                              disabled={pending}
                              aria-busy={
                                deleteTarget?.id === journey.id &&
                                journeyDeleting
                              }
                              aria-label={tri(
                                lang,
                                `Excluir ${journey.title}`,
                                `Delete ${journey.title}`,
                                `Eliminar ${journey.title}`,
                              )}
                              onClick={() => setDeleteTarget(journey)}
                            >
                              {deleteTarget?.id === journey.id &&
                              journeyDeleting ? (
                                <LoaderCircle
                                  className="spin"
                                  size={13}
                                  aria-hidden
                                />
                              ) : (
                                <Trash2 size={13} aria-hidden />
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {hasLoose && (
                        <li
                          data-active={selectedJourney === "loose" || undefined}
                        >
                          <button
                            type="button"
                            disabled={pending}
                            aria-pressed={selectedJourney === "loose"}
                            onClick={() => {
                              setSelectedJourney("loose");
                              setNaming(null);
                              setStep("work");
                            }}
                          >
                            <CalendarDays size={13} aria-hidden />
                            <span>
                              <strong>
                                {tri(
                                  lang,
                                  "Sessões avulsas",
                                  "Loose sessions",
                                  "Sesiones sueltas",
                                )}
                              </strong>
                              <small>
                                {
                                  sessions.filter(
                                    (session) => !session.journeyId,
                                  ).length
                                }
                              </small>
                            </span>
                            {selectedJourney === "loose" && (
                              <Check size={13} aria-hidden />
                            )}
                          </button>
                        </li>
                      )}
                    </ul>
                  </section>
                  {namingOpen && (
                    <div className="journey-naming">
                      <span>
                        {naming === "rename"
                          ? tri(
                              lang,
                              "Renomear jornada",
                              "Rename journey",
                              "Renombrar recorrido",
                            )
                          : journeyList.length
                            ? tri(
                                lang,
                                `Nova jornada de ${game.name}`,
                                `New ${game.name} journey`,
                                `Nuevo recorrido de ${game.name}`,
                              )
                            : tri(
                                lang,
                                "Dê um nome à sua jornada",
                                "Name your journey",
                                "Ponle nombre a tu recorrido",
                              )}
                      </span>
                      <div>
                        <input
                          value={namingTitle}
                          maxLength={80}
                          autoFocus
                          disabled={pending}
                          placeholder={tri(
                            lang,
                            "ex: Primeira campanha, Replay 2026…",
                            "e.g. First playthrough, 2026 replay…",
                            "ej.: Primera campaña, Repetición 2026…",
                          )}
                          onChange={(event) =>
                            setNamingTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void submitJourneyName();
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={!namingTitle.trim() || pending}
                          onClick={() => void submitJourneyName()}
                        >
                          {pending ? (
                            <LoaderCircle
                              className="spin"
                              size={13}
                              aria-hidden
                            />
                          ) : (
                            <Check size={13} />
                          )}
                          {naming === "rename"
                            ? t.save
                            : tri(lang, "Criar", "Create", "Crear")}
                        </button>
                        {naming !== null && selectedJourney !== null && (
                          <button
                            type="button"
                            data-quiet
                            onClick={() => setNaming(null)}
                          >
                            {t.cancel}
                          </button>
                        )}
                      </div>
                      {naming !== "rename" && (
                        <p>
                          {tri(
                            lang,
                            "Cada jornada é uma passagem pelo jogo. Você pode criar quantas quiser e registrar as sessões de cada uma.",
                            "Each journey is one playthrough. Create as many as you want and log each one's sessions.",
                            "Cada recorrido es una partida completa. Crea los que quieras y registra las sesiones de cada uno.",
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  <footer className="studio-choose-actions">
                    <Dialog.Close type="button" disabled={pending}>
                      {t.cancel}
                    </Dialog.Close>
                    <button
                      type="button"
                      data-primary
                      disabled={pending || selectedJourney === null}
                      onClick={() => setStep("work")}
                    >
                      {tri(
                        lang,
                        "Abrir o diário",
                        "Open the journal",
                        "Abrir el diario",
                      )}
                      <ArrowRight size={14} />
                    </button>
                  </footer>
                </div>
              )}
            {mode === "diary" &&
              step === "work" &&
              !openDay &&
              !dayEditor &&
              selectedJourney !== null && (
                <div className="social-editor-form journey-editor">
                  <div className="studio-step-bar">
                    <button type="button" onClick={() => setStep("choose")}>
                      <ArrowLeft size={14} />
                      {tri(
                        lang,
                        "Trocar jornada",
                        "Switch journey",
                        "Cambiar recorrido",
                      )}
                    </button>
                    <span>{journeyLabel}</span>
                  </div>
                  {activeJourney && naming === null && (
                    <div className="journey-manage">
                      {activeJourney.publicId && (
                        <Link
                          href={`/${lang}/journal/${activeJourney.publicId}`}
                          onClick={() => setOpen(false)}
                        >
                          <Map size={12} />{" "}
                          {tri(
                            lang,
                            "Visualizar jornada",
                            "View journey",
                            "Ver recorrido",
                          )}
                        </Link>
                      )}
                      {/* Delete lives on the journey's own row in the strip
                        above; repeating it here made the selected journey the
                        only one that could be removed. */}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setNaming("rename");
                          setNamingTitle(activeJourney.title);
                        }}
                      >
                        <Pencil size={12} />{" "}
                        {tri(lang, "Renomear", "Rename", "Renombrar")}
                      </button>
                    </div>
                  )}
                  <div className="journey-editor-workspace">
                    <div className="journey-editor-summary">
                      <section className="journey-overview">
                        <header>
                          <div>
                            <span>
                              {tri(
                                lang,
                                "DIÁRIO DE JOGO",
                                "PLAY JOURNAL",
                                "DIARIO DE JUEGO",
                              )}
                            </span>
                            <strong>
                              {activeJourney?.title ??
                                tri(
                                  lang,
                                  "Sessões avulsas",
                                  "Loose sessions",
                                  "Sesiones sueltas",
                                )}
                            </strong>
                          </div>
                          <p>
                            {tri(
                              lang,
                              "Toque em um dia para registrar o que aconteceu.",
                              "Choose a day to record what happened.",
                              "Elige un día para registrar lo que pasó.",
                            )}
                          </p>
                        </header>
                        <dl>
                          <div>
                            <dt>
                              <CalendarDays size={13} /> {t.sessions}
                            </dt>
                            <dd>{currentSessions.length}</dd>
                          </div>
                          {/* Entries and days stopped being the same number the
                              moment a day could hold more than one. */}
                          <div>
                            <dt>
                              <CalendarDays size={13} />{" "}
                              {tri(lang, "Dias", "Days", "Días")}
                            </dt>
                            <dd>{journeyDays || "-"}</dd>
                          </div>
                          <div>
                            <dt>
                              <Clock3 size={13} />{" "}
                              {tri(lang, "Tempo", "Time", "Tiempo")}
                            </dt>
                            <dd>{formatSessionTime(journeyMinutes) ?? "-"}</dd>
                          </div>
                          <div>
                            <dt>
                              <Play size={12} />{" "}
                              {tri(lang, "Início", "Start", "Inicio")}
                            </dt>
                            <dd>{journeyDate(journeyStarted)}</dd>
                          </div>
                          <div
                            data-finished={
                              Boolean(journeyFinished) || undefined
                            }
                          >
                            <dt>
                              <Flag size={12} />{" "}
                              {tri(lang, "Fim", "Finish", "Fin")}
                            </dt>
                            <dd>{journeyDate(journeyFinished)}</dd>
                          </div>
                        </dl>
                      </section>
                      <div className="journey-open-day">
                        <label>
                          <span>
                            {tri(
                              lang,
                              "Abrir um dia",
                              "Open a day",
                              "Abrir un día",
                            )}
                          </span>
                          <input
                            type="date"
                            max={today || undefined}
                            value={openDayValue || today}
                            onChange={(event) =>
                              setOpenDayValue(event.target.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!(openDayValue || today) || pending}
                          onClick={() => {
                            const day = openDayValue || today;
                            if (day) showDay(day);
                          }}
                        >
                          {t.open}
                        </button>
                      </div>
                    </div>
                    <JourneyCalendar
                      lang={lang}
                      maxDate={today}
                      sessions={currentSessions}
                      busy={pending}
                      onDayOpen={showDay}
                      onBulkAdd={bulkAdd}
                      onBulkRemove={bulkRemove}
                    />
                  </div>
                  {error && (
                    <p className="social-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <footer>
                    <Dialog.Close type="button" disabled={pending}>
                      {tri(lang, "Concluído", "Done", "Hecho")}
                    </Dialog.Close>
                  </footer>
                </div>
              )}
            {mode === "diary" && openDay && !dayEditor && (
              <JourneyDaySheet
                key={openDay}
                day={openDay}
                sessions={sessionsFor(openDay)}
                journeyTitle={journeyLabel}
                lang={lang}
                pending={pending}
                onBack={() => setOpenDay(null)}
                onEdit={(session) => editEntry(openDay, session)}
                onCreate={() => editEntry(openDay, null)}
                onRemoveDay={() => removeWholeDay(openDay)}
              />
            )}
            {mode === "diary" && dayEditor && (
              <JourneyEntryEditor
                key={dayEditor.day + (dayEditor.session?.id ?? "new")}
                day={dayEditor.day}
                session={dayEditor.session}
                journeyTitle={journeyLabel}
                lang={lang}
                pending={pending}
                onBack={() => setDayEditor(null)}
                onSave={saveDay}
                onRemove={dayEditor.session ? removeDay : undefined}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Deleting a journey takes its sessions with it: the foreign key
          cascades. That is worth a sentence and a second look, not a bin that
          arms itself for four seconds and disarms without saying so. */}
      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next && !pending) setDeleteTarget(null);
        }}
      >
        <Dialog.Portal>
          {/* Its own veil, not the drawer's: that one sits at z-index 60,
              under the composer at 90, so it dimmed the page and left the
              dialog it was asking about at full brightness. */}
          <Dialog.Overlay className="journey-delete-backdrop" />
          <Dialog.Content
            className="journey-delete-dialog"
            aria-describedby={undefined}
          >
            <Dialog.Title>
              {tri(
                lang,
                "Excluir esta jornada?",
                "Delete this journey?",
                "¿Eliminar este recorrido?",
              )}
            </Dialog.Title>
            <p>
              {(() => {
                const count = deleteTarget
                  ? sessions.filter(
                      (session) => session.journeyId === deleteTarget.id,
                    ).length
                  : 0;
                const title = deleteTarget?.title ?? "";
                return count === 0
                  ? tri(
                      lang,
                      `“${title}” ainda não tem registros. Isso não pode ser desfeito.`,
                      `“${title}” has no entries yet. This cannot be undone.`,
                      `“${title}” aún no tiene registros. Esto no se puede deshacer.`,
                    )
                  : tri(
                      lang,
                      `“${title}” e ${count} ${count === 1 ? "registro" : "registros"} vão junto. Isso não pode ser desfeito.`,
                      `“${title}” and ${count} ${count === 1 ? "entry" : "entries"} go with it. This cannot be undone.`,
                      `“${title}” y ${count} ${count === 1 ? "registro" : "registros"} se van con él. Esto no se puede deshacer.`,
                    );
              })()}
            </p>
            <footer>
              <Dialog.Close disabled={pending}>{t.cancel}</Dialog.Close>
              <button
                type="button"
                data-danger
                disabled={pending}
                onClick={() => {
                  if (deleteTarget) void deleteJourney(deleteTarget);
                }}
              >
                {journeyDeleting && (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                )}
                {journeyDeleting
                  ? t.removing
                  : tri(lang, "Excluir", "Delete", "Eliminar")}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
