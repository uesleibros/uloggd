"use client";

import { Checkbox } from "@/components/ui/checkbox";

import * as Dialog from "@/components/ui/dialog";
import {
  ArrowLeft,
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
  Search,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocalToday } from "@/components/use-local-today";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  formatSessionTime,
  JourneyCalendar,
  type JourneyOption,
  type JourneySession,
} from "./journey-calendar";
import {
  EditorVisibilitySelect,
  ReviewStudioForm,
  type ReviewRpcFields,
} from "./review-studio-form";
import { ScreenshotStudioForm } from "./screenshot-studio-form";
import {
  CommunityScopeSelect,
  type CommunityScope,
} from "./community-scope-select";
import { CommunityTextArea } from "./comment-parts";

type Mode = "review" | "diary" | "list" | "screenshot";
type ListOption = { id: string; name: string };
export type ReviewOption = {
  publicId: string;
  title: string | null;
  rating: number | null;
  ratingMode: "stars_5" | "level_5" | "score_10" | "score_100" | "recommend";
  recommended: boolean | null;
  createdAt: string;
  journeyTitle: string | null;
};
type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
type SelectedJourney = string | "loose" | null;
type DayPayload = {
  minutes: number | null;
  note: string;
  marksStart: boolean;
  marksFinish: boolean;
  spoilers: boolean;
  visibility: Visibility;
  commentsScope: CommunityScope;
};

export function GameLogActions({
  game,
  platforms,
  lang,
  lists,
  logCount,
  journeys = [],
  journeyOptions = [],
  reviews = [],
  initialMode = null,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: UiLang;
  lists: ListOption[];
  logCount: number;
  journeys?: JourneySession[];
  journeyOptions?: JourneyOption[];
  reviews?: ReviewOption[];
  initialMode?: Mode | null;
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
    journeyOptions[0]?.id ?? (hasLoose ? "loose" : null),
  );
  const [namingTitle, setNamingTitle] = useState("");
  const [naming, setNaming] = useState<"create" | "rename" | null>(null);
  const [journeyArmed, setJourneyArmed] = useState(false);
  const [journeyDeleting, setJourneyDeleting] = useState(false);
  const journeyDisarmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (journeyDisarmTimer.current)
        window.clearTimeout(journeyDisarmTimer.current);
    },
    [],
  );
  const [dayEditor, setDayEditor] = useState<{
    day: string;
    session: JourneySession | null;
  } | null>(null);
  const [openDayValue, setOpenDayValue] = useState("");
  const [listChoice, setListChoice] = useState(lists[0]?.id ?? "");
  const [listQuery, setListQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeJourney =
    typeof selectedJourney === "string" && selectedJourney !== "loose"
      ? (journeyList.find((journey) => journey.id === selectedJourney) ?? null)
      : null;
  const entryJourney = activeJourney?.id ?? null;
  const currentSessions = sessions.filter((session) =>
    selectedJourney === "loose"
      ? !session.journeyId
      : session.journeyId === entryJourney,
  );
  const filteredLists = lists.filter((list) =>
    list.name
      .toLocaleLowerCase()
      .includes(listQuery.trim().toLocaleLowerCase()),
  );

  function sessionFor(day: string) {
    return (
      currentSessions.find(
        (session) =>
          day >= session.start && day <= (session.end ?? session.start),
      ) ?? null
    );
  }

  async function performReview(fields: ReviewRpcFields) {
    setPending(true);
    const client = createClient();
    const { error: rpcError } = await client.rpc("create_review", {
      game_id: game.id,
      game_slug: game.slug,
      ...fields,
    });
    if (!rpcError) {
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
      const { error: rpcError } = await createClient().rpc("rename_journey", {
        target_journey: activeJourney.id,
        journey_title: title,
      });
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
    const { data, error: rpcError } = await createClient().rpc(
      "create_journey",
      { game_id: game.id, game_slug: game.slug, journey_title: title },
    );
    if (rpcError || !data) {
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
        id: data.id as string,
        title: data.title as string,
        publicId: (data.public_id as string | null) ?? null,
      };
      setJourneyList((current) => [...current, created]);
      setSelectedJourney(created.id);
      setNaming(null);
      setNamingTitle("");
      router.refresh();
    }
    setPending(false);
  }

  async function deleteJourney() {
    if (!activeJourney || pending) return;
    if (!journeyArmed) {
      setJourneyArmed(true);
      if (journeyDisarmTimer.current)
        window.clearTimeout(journeyDisarmTimer.current);
      journeyDisarmTimer.current = window.setTimeout(
        () => setJourneyArmed(false),
        4000,
      );
      return;
    }
    if (journeyDisarmTimer.current)
      window.clearTimeout(journeyDisarmTimer.current);
    setJourneyArmed(false);
    setJourneyDeleting(true);
    setPending(true);
    const { error: rpcError } = await createClient().rpc("delete_journey", {
      target_journey: activeJourney.id,
    });
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
      current.filter((journey) => journey.id !== activeJourney.id),
    );
    setSessions((current) =>
      current.filter((session) => session.journeyId !== activeJourney.id),
    );
    const fallback =
      journeyList.find((journey) => journey.id !== activeJourney.id)?.id ??
      (hasLoose ? "loose" : null);
    setSelectedJourney(fallback);
    setJourneyDeleting(false);
    setPending(false);
    router.refresh();
  }

  function openDay(day: string, session: JourneySession | null) {
    if (pending || session?.id.startsWith("temp-")) return;
    setError(null);
    setDayEditor({ day, session });
  }

  async function bulkAdd(days: string[]) {
    if (pending || selectedJourney === null) return;
    const fresh = days.filter((day) => !sessionFor(day));
    if (!fresh.length) return;
    setError(null);
    setPending(true);
    setSessions((current) => [
      ...current,
      ...fresh.map((day) => ({
        id: `temp-${day}`,
        start: day,
        end: null,
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
    const { error: rpcError } = await createClient().rpc(
      "bulk_save_diary_days",
      {
        game_id: game.id,
        game_slug: game.slug,
        days: fresh,
        entry_journey: entryJourney,
      },
    );
    if (rpcError) {
      setSessions(sessions);
      setPending(false);
      setError(t.couldNotSave);
    } else {
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
    const { error: rpcError } = await createClient().rpc(
      "bulk_delete_diary_days",
      { game_id: game.id, days, entry_journey: entryJourney },
    );
    if (rpcError) {
      setSessions(sessions);
      setPending(false);
      setError(t.couldNotRemove);
    } else {
      router.refresh();
    }
  }

  async function saveDay(payload: DayPayload) {
    if (!dayEditor) return false;
    setPending(true);
    const supabase = createClient();
    const { session, day } = dayEditor;
    const { data, error: rpcError } = session
      ? await supabase.rpc("update_diary_entry", {
          entry_id: session.id,
          entry_date: session.start,
          entry_end: session.end,
          entry_minutes: payload.minutes,
          entry_note: payload.note,
          spoilers: payload.spoilers,
          entry_visibility: payload.visibility,
          entry_marks_start: payload.marksStart,
          entry_marks_finish: payload.marksFinish,
        })
      : await supabase.rpc("save_diary_entry", {
          game_id: game.id,
          game_slug: game.slug,
          entry_date: day,
          entry_minutes: payload.minutes,
          entry_note: payload.note,
          spoilers: payload.spoilers,
          entry_visibility: payload.visibility,
          entry_marks_start: payload.marksStart,
          entry_marks_finish: payload.marksFinish,
          entry_journey: entryJourney,
        });
    if (rpcError) {
      setPending(false);
      return false;
    }
    const saved = Array.isArray(data) ? data[0] : data;
    const entryId = session?.id ?? saved?.id;
    if (entryId) {
      const { error: scopeError } = await supabase
        .from("diary_entries")
        .update({ comments_scope: payload.commentsScope })
        .eq("id", entryId);
      if (scopeError) {
        setPending(false);
        return false;
      }
    }
    setDayEditor(null);
    router.refresh();
    return true;
  }

  async function removeDay() {
    if (!dayEditor?.session) return false;
    setPending(true);
    const { error: rpcError } = await createClient().rpc("delete_diary_entry", {
      entry_id: dayEditor.session.id,
    });
    if (rpcError) {
      setPending(false);
      return false;
    }
    setDayEditor(null);
    router.refresh();
    return true;
  }

  async function submitList() {
    if (pending || !listChoice) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const { error: rpcError } = await createClient().rpc("add_game_to_list", {
      target_list: listChoice,
      game_id: game.id,
      game_slug: game.slug,
    });
    if (rpcError) {
      setError(
        tri(
          lang,
          "Não foi possível salvar. Confira os campos e tente novamente.",
          "Could not save. Check the fields and try again.",
          "No se pudo guardar. Revisa los campos e inténtalo de nuevo.",
        ),
      );
    } else {
      setSuccess(
        tri(
          lang,
          "Adicionado à lista.",
          "Added to the list.",
          "Añadido a la lista.",
        ),
      );
      router.refresh();
      window.setTimeout(() => {
        setOpen(false);
      }, 420);
    }
    setPending(false);
  }

  const labels = {
    review: tri(lang, "Nova avaliação", "New review", "Nueva reseña"),
    diary: tri(lang, "Sua jornada", "Your journey", "Tu recorrido"),
    list: tri(lang, "Adicionar à lista", "Add to list", "Añadir a la lista"),
    screenshot: tri(lang, "Nova captura", "New screenshot", "Nueva captura"),
  };
  function openMode(nextMode: Mode) {
    setError(null);
    setSuccess(null);
    setDayEditor(null);
    setNaming(null);
    setNamingTitle("");
    if (nextMode === "list") setListQuery("");
    setMode(nextMode);
    setOpen(true);
  }

  const namingOpen = naming !== null || selectedJourney === null;
  const journeyMinutes = currentSessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
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
  const journeyDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(lang, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${value}T00:00:00Z`))
      : "—";
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
        <button type="button" onClick={() => openMode("list")}>
          <ListPlus size={15} /> {labels.list}
        </button>
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
            {mode === "review" && (
              <>
                <section className="review-history-strip">
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
                  <div role="list">
                    <span data-new role="listitem">
                      <Plus size={12} />
                      {tri(lang, "Nova", "New", "Nueva")}
                    </span>
                    {reviews.map((review) => {
                      const score = reviewScore(review);
                      return (
                        <Link
                          key={review.publicId}
                          href={`/${lang}/review/${review.publicId}`}
                          role="listitem"
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
                      );
                    })}
                  </div>
                </section>
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
            {mode === "diary" && !dayEditor && (
              <div className="social-editor-form journey-editor">
                <div className="journey-picker">
                  {journeyList.map((journey) => (
                    <button
                      key={journey.id}
                      type="button"
                      data-active={selectedJourney === journey.id || undefined}
                      onClick={() => {
                        setSelectedJourney(journey.id);
                        setNaming(null);
                        setJourneyArmed(false);
                        setJourneyDeleting(false);
                      }}
                    >
                      <Map size={12} /> {journey.title}
                    </button>
                  ))}
                  {hasLoose && (
                    <button
                      type="button"
                      data-active={selectedJourney === "loose" || undefined}
                      onClick={() => {
                        setSelectedJourney("loose");
                        setNaming(null);
                        setJourneyArmed(false);
                        setJourneyDeleting(false);
                      }}
                    >
                      {tri(
                        lang,
                        "Sessões avulsas",
                        "Loose sessions",
                        "Sesiones sueltas",
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    data-new
                    onClick={() => {
                      setNaming("create");
                      setNamingTitle("");
                    }}
                  >
                    <Plus size={12} />{" "}
                    {tri(
                      lang,
                      "Nova jornada",
                      "New journey",
                      "Nuevo recorrido",
                    )}
                  </button>
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
                    <button
                      type="button"
                      onClick={() => {
                        setNaming("rename");
                        setNamingTitle(activeJourney.title);
                      }}
                    >
                      <Pencil size={12} />{" "}
                      {tri(lang, "Renomear", "Rename", "Renombrar")}
                    </button>
                    <button
                      type="button"
                      data-armed={journeyArmed || undefined}
                      onClick={deleteJourney}
                      disabled={pending}
                      aria-busy={journeyDeleting}
                    >
                      {journeyDeleting ? (
                        <LoaderCircle className="spin" size={12} aria-hidden />
                      ) : (
                        <Trash2 size={12} />
                      )}{" "}
                      {journeyDeleting
                        ? tri(lang, "Excluindo…", "Deleting…", "Eliminando…")
                        : journeyArmed
                          ? tri(
                              lang,
                              "Excluir jornada e sessões?",
                              "Delete journey and sessions?",
                              "¿Eliminar recorrido y sesiones?",
                            )
                          : t.delete}
                    </button>
                  </div>
                )}
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
                        placeholder={tri(
                          lang,
                          "ex: Primeira campanha, Replay 2026…",
                          "e.g. First playthrough, 2026 replay…",
                          "ej.: Primera campaña, Repetición 2026…",
                        )}
                        onChange={(event) => setNamingTitle(event.target.value)}
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
                    {selectedJourney === null && (
                      <p>
                        {tri(
                          lang,
                          "Cada jornada é uma passagem pelo jogo — você pode criar quantas quiser e registrar as sessões de cada uma.",
                          "Each journey is one playthrough — create as many as you want and log each one's sessions.",
                          "Cada recorrido es una partida completa: crea los que quieras y registra las sesiones de cada uno.",
                        )}
                      </p>
                    )}
                  </div>
                )}
                {selectedJourney !== null && (
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
                          <div>
                            <dt>
                              <Clock3 size={13} />{" "}
                              {tri(lang, "Tempo", "Time", "Tiempo")}
                            </dt>
                            <dd>{formatSessionTime(journeyMinutes) ?? "—"}</dd>
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
                            if (day) openDay(day, sessionFor(day));
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
                      onDayOpen={openDay}
                      onBulkAdd={bulkAdd}
                      onBulkRemove={bulkRemove}
                    />
                  </div>
                )}
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
            {mode === "diary" && dayEditor && (
              <JourneyDayEditor
                key={dayEditor.day + (dayEditor.session?.id ?? "new")}
                day={dayEditor.day}
                session={dayEditor.session}
                journeyTitle={
                  activeJourney?.title ??
                  tri(
                    lang,
                    "Sessões avulsas",
                    "Loose sessions",
                    "Sesiones sueltas",
                  )
                }
                lang={lang}
                pending={pending}
                onBack={() => setDayEditor(null)}
                onSave={saveDay}
                onRemove={dayEditor.session ? removeDay : undefined}
              />
            )}
            {mode === "list" && (
              <form action={submitList} className="social-editor-form">
                {lists.length ? (
                  <fieldset className="game-list-picker">
                    <legend>{t.list}</legend>
                    <label className="game-list-picker-search">
                      <Search size={14} aria-hidden />
                      <input
                        value={listQuery}
                        onChange={(event) => setListQuery(event.target.value)}
                        placeholder={tri(
                          lang,
                          "Buscar nas suas listas…",
                          "Search your lists…",
                          "Buscar en tus listas…",
                        )}
                        aria-label={tri(
                          lang,
                          "Buscar lista",
                          "Search lists",
                          "Buscar lista",
                        )}
                        autoFocus
                      />
                      {listQuery && (
                        <button
                          type="button"
                          onClick={() => setListQuery("")}
                          aria-label={t.clear}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </label>
                    <div className="game-list-picker-results">
                      {filteredLists.length ? (
                        filteredLists.map((list) => (
                          <button
                            type="button"
                            key={list.id}
                            data-active={listChoice === list.id || undefined}
                            aria-pressed={listChoice === list.id}
                            onClick={() => setListChoice(list.id)}
                          >
                            <ListPlus size={15} />
                            <span>{list.name}</span>
                            {listChoice === list.id && <Check size={14} />}
                          </button>
                        ))
                      ) : (
                        <p>
                          {tri(
                            lang,
                            "Nenhuma lista encontrada.",
                            "No lists found.",
                            "No se encontraron listas.",
                          )}
                        </p>
                      )}
                    </div>
                    <small>
                      {tri(
                        lang,
                        `${filteredLists.length} de ${lists.length} listas`,
                        `${filteredLists.length} of ${lists.length} lists`,
                        `${filteredLists.length} de ${lists.length} listas`,
                      )}
                    </small>
                  </fieldset>
                ) : (
                  <p className="social-empty-inline">
                    {tri(
                      lang,
                      "Crie uma lista primeiro na página de listas.",
                      "Create a list on the lists page first.",
                      "Crea antes una lista en la página de listas.",
                    )}
                  </p>
                )}
                {error && (
                  <p className="social-form-error" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="social-form-success" role="status">
                    {success}
                  </p>
                )}
                <footer>
                  <Dialog.Close type="button" disabled={pending}>
                    {t.cancel}
                  </Dialog.Close>
                  <button
                    type="submit"
                    aria-busy={pending}
                    data-loading={pending || undefined}
                    disabled={pending || !listChoice}
                  >
                    {pending && (
                      <LoaderCircle className="spin" size={15} aria-hidden />
                    )}
                    {pending ? t.saving : t.save}
                  </button>
                </footer>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function JourneyDayEditor({
  day,
  session,
  journeyTitle,
  lang,
  pending,
  onBack,
  onSave,
  onRemove,
}: {
  day: string;
  session: JourneySession | null;
  journeyTitle: string;
  lang: UiLang;
  pending: boolean;
  onBack: () => void;
  onSave: (payload: DayPayload) => Promise<boolean>;
  onRemove?: () => Promise<boolean>;
}) {
  const t = uiText(lang);
  const total = session?.minutes ?? 0;
  const [hours, setHours] = useState(
    total >= 60 ? String(Math.floor(total / 60)) : "",
  );
  const [minutes, setMinutes] = useState(total % 60 ? String(total % 60) : "");
  const [note, setNote] = useState(session?.note ?? "");
  const [marksStart, setMarksStart] = useState(Boolean(session?.marksStart));
  const [marksFinish, setMarksFinish] = useState(Boolean(session?.marksFinish));
  const [spoilers, setSpoilers] = useState(Boolean(session?.spoilers));
  const [visibility, setVisibility] = useState<Visibility>(
    session?.visibility ?? "PUBLIC",
  );
  const [commentsScope, setCommentsScope] = useState<CommunityScope>(
    session?.commentsScope ?? "EVERYONE",
  );
  const [failure, setFailure] = useState<"save" | "remove" | null>(null);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [removePending, setRemovePending] = useState(false);
  const removeDisarmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (removeDisarmTimer.current)
        window.clearTimeout(removeDisarmTimer.current);
    },
    [],
  );

  const rangeLabel = new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${session?.start ?? day}T00:00:00Z`));

  async function submit() {
    setFailure(null);
    const totalMinutes =
      (Number(hours) || 0) * 60 + Math.min(59, Number(minutes) || 0);
    const saved = await onSave({
      minutes: totalMinutes > 0 ? totalMinutes : null,
      note,
      marksStart,
      marksFinish,
      spoilers,
      visibility,
      commentsScope,
    });
    if (!saved) setFailure("save");
  }

  async function remove() {
    if (!onRemove || pending || removePending) return;
    if (!removeArmed) {
      setRemoveArmed(true);
      if (removeDisarmTimer.current)
        window.clearTimeout(removeDisarmTimer.current);
      removeDisarmTimer.current = window.setTimeout(
        () => setRemoveArmed(false),
        4000,
      );
      return;
    }
    if (removeDisarmTimer.current)
      window.clearTimeout(removeDisarmTimer.current);
    setRemoveArmed(false);
    setRemovePending(true);
    setFailure(null);
    const removed = await onRemove();
    if (!removed) {
      setRemovePending(false);
      setFailure("remove");
    }
  }

  return (
    <form action={submit} className="social-editor-form journey-day-editor">
      <div className="journey-day-heading">
        <button
          type="button"
          data-motion="none"
          onClick={onBack}
          disabled={pending}
          aria-label={tri(
            lang,
            "Voltar ao calendário",
            "Back to calendar",
            "Volver al calendario",
          )}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <span>{journeyTitle.toUpperCase()}</span>
          <strong>{rangeLabel}</strong>
        </div>
      </div>
      <div className="journey-milestones">
        <button
          type="button"
          data-milestone="start"
          aria-pressed={marksStart}
          onClick={() => setMarksStart((value) => !value)}
        >
          <Play size={15} />
          <span>
            <strong>
              {tri(
                lang,
                "Comecei o jogo aqui",
                "Started the game here",
                "Empecé el juego aquí",
              )}
            </strong>
            <small>
              {tri(
                lang,
                "Marca o início da jornada",
                "Marks the journey start",
                "Marca el inicio del recorrido",
              )}
            </small>
          </span>
        </button>
        <button
          type="button"
          data-milestone="finish"
          aria-pressed={marksFinish}
          onClick={() => setMarksFinish((value) => !value)}
        >
          <Flag size={15} />
          <span>
            <strong>
              {tri(
                lang,
                "Terminei o jogo aqui",
                "Finished the game here",
                "Terminé el juego aquí",
              )}
            </strong>
            <small>
              {tri(
                lang,
                "Marca o fim da jornada",
                "Marks the journey end",
                "Marca el fin del recorrido",
              )}
            </small>
          </span>
        </button>
      </div>
      <div className="journey-time-fields">
        <span>{tri(lang, "Tempo jogado", "Time played", "Tiempo jugado")}</span>
        <div>
          <label>
            <input
              type="number"
              min={0}
              max={24}
              inputMode="numeric"
              placeholder="0"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
            <small>{tri(lang, "horas", "hours", "horas")}</small>
          </label>
          <b>:</b>
          <label>
            <input
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              placeholder="0"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
            <small>{tri(lang, "minutos", "minutes", "minutos")}</small>
          </label>
        </div>
      </div>
      <CommunityTextArea
        id="diary-note"
        label={tri(lang, "O que rolou na sessão", "What happened", "Qué pasó")}
        maxLength={1000}
        rows={4}
        value={note}
        onChange={setNote}
        placeholder={tri(
          lang,
          "Conte o que você fez nesse dia.",
          "Tell what you did on this day.",
          "Cuenta lo que hiciste ese día.",
        )}
      />
      <div className="social-form-row social-form-options">
        <label>
          <span>{t.visibility}</span>
          <EditorVisibilitySelect
            value={visibility}
            onChange={setVisibility}
            lang={lang}
          />
        </label>
        <label>
          <span>{tri(lang, "Comentários", "Comments", "Comentarios")}</span>
          <CommunityScopeSelect
            value={commentsScope}
            onChange={setCommentsScope}
            lang={lang}
          />
        </label>
        <label className="social-check">
          <Checkbox checked={spoilers} onCheckedChange={setSpoilers} />
          <span>{t.containsSpoilers}</span>
        </label>
      </div>
      {failure && (
        <p className="social-form-error" role="alert">
          {failure === "remove"
            ? tri(
                lang,
                "Não foi possível excluir a sessão.",
                "Could not delete the session.",
                "No se pudo eliminar la sesión.",
              )
            : tri(
                lang,
                "Não foi possível salvar a sessão.",
                "Could not save the session.",
                "No se pudo guardar la sesión.",
              )}
        </p>
      )}
      <footer className="journey-day-actions">
        {onRemove && (
          <button
            type="button"
            className="journey-day-remove"
            onClick={() => void remove()}
            disabled={pending || removePending}
            data-armed={removeArmed || undefined}
            aria-busy={removePending}
          >
            {removePending ? (
              <LoaderCircle className="spin" size={14} aria-hidden />
            ) : (
              <Trash2 size={14} />
            )}{" "}
            {removePending
              ? tri(lang, "Excluindo…", "Deleting…", "Eliminando…")
              : removeArmed
                ? tri(
                    lang,
                    "Excluir mesmo?",
                    "Really delete?",
                    "¿Eliminar de verdad?",
                  )
                : t.remove}
          </button>
        )}
        <button type="button" onClick={onBack} disabled={pending}>
          {t.back}
        </button>
        <button
          type="submit"
          aria-busy={pending}
          data-loading={pending || undefined}
          disabled={pending}
        >
          {pending && !removePending && (
            <LoaderCircle className="spin" size={15} aria-hidden />
          )}
          {pending && !removePending
            ? t.saving
            : tri(lang, "Salvar sessão", "Save session", "Guardar sesión")}
        </button>
      </footer>
    </form>
  );
}
