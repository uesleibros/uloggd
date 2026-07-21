"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Check,
  ChevronDown,
  Flag,
  ListPlus,
  LoaderCircle,
  Map,
  Pencil,
  ScanLine,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
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

type Mode = "review" | "diary" | "list" | "screenshot";
type ListOption = { id: string; name: string };
type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
type SelectedJourney = string | "loose" | null;
type DayPayload = {
  minutes: number | null;
  note: string;
  marksStart: boolean;
  marksFinish: boolean;
  spoilers: boolean;
  visibility: Visibility;
};

export function GameLogActions({
  game,
  platforms,
  lang,
  lists,
  logCount,
  journeys = [],
  journeyOptions = [],
  initialMode = null,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: UiLang;
  lists: ListOption[];
  logCount: number;
  journeys?: JourneySession[];
  journeyOptions?: JourneyOption[];
  initialMode?: Mode | null;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [open, setOpen] = useState(Boolean(initialMode));
  const [pending, setPending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
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
  const [dayEditor, setDayEditor] = useState<{
    day: string;
    session: JourneySession | null;
  } | null>(null);
  const [openDayValue, setOpenDayValue] = useState(today);
  const [listChoice, setListChoice] = useState(lists[0]?.id ?? "");
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
    const { error: rpcError } = await createClient().rpc("create_review", {
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
      const created = { id: data.id as string, title: data.title as string };
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
      window.setTimeout(() => setJourneyArmed(false), 4000);
      return;
    }
    setJourneyArmed(false);
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
    const { error: rpcError } = session
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
    setDayEditor(null);
    router.refresh();
    return true;
  }

  async function removeDay() {
    if (!dayEditor?.session) return;
    setPending(true);
    const { error: rpcError } = await createClient().rpc("delete_diary_entry", {
      entry_id: dayEditor.session.id,
    });
    if (rpcError) {
      setPending(false);
      return;
    }
    setDayEditor(null);
    router.refresh();
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
          "Salvo na sua jornada.",
          "Saved to your journey.",
          "Guardado en tu recorrido.",
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
    setMode(nextMode);
    setOpen(true);
  }

  const namingOpen = naming !== null || selectedJourney === null;

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
            className={`social-editor-dialog${mode === "review" ? " review-studio-dialog" : ""}`}
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
              <ReviewStudioForm
                lang={lang}
                platforms={platforms}
                journeyOptions={journeyList}
                draftKey={`uloggd:review-draft:${game.id}`}
                submitLabel={tri(
                  lang,
                  "Publicar avaliação",
                  "Publish review",
                  "Publicar reseña",
                )}
                busyLabel={tri(
                  lang,
                  "Publicando…",
                  "Publishing…",
                  "Publicando…",
                )}
                successLabel={tri(
                  lang,
                  "Salvo na sua jornada.",
                  "Saved to your journey.",
                  "Guardado en tu recorrido.",
                )}
                onPerform={performReview}
              />
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
                    >
                      <Trash2 size={12} />{" "}
                      {journeyArmed
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
                  <>
                    <JourneyCalendar
                      lang={lang}
                      maxDate={today}
                      sessions={currentSessions}
                      busy={pending}
                      onDayOpen={openDay}
                      onBulkAdd={bulkAdd}
                      onBulkRemove={bulkRemove}
                    />
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
                          max={today}
                          value={openDayValue}
                          onChange={(event) =>
                            setOpenDayValue(event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!openDayValue || pending}
                        onClick={() =>
                          openDay(openDayValue, sessionFor(openDayValue))
                        }
                      >
                        {t.open}
                      </button>
                    </div>
                  </>
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
                  <label>
                    <span>{t.list}</span>
                    <Select.Root
                      value={listChoice}
                      onValueChange={setListChoice}
                    >
                      <Select.Trigger className="editor-select-trigger">
                        <Select.Value
                          placeholder={tri(
                            lang,
                            "Selecione uma lista",
                            "Select a list",
                            "Selecciona una lista",
                          )}
                        />
                        <Select.Icon>
                          <ChevronDown size={14} />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="editor-select-menu"
                          position="popper"
                          sideOffset={6}
                          collisionPadding={12}
                        >
                          <Select.Viewport>
                            {lists.map((list) => (
                              <Select.Item
                                className="editor-select-option"
                                value={list.id}
                                key={list.id}
                              >
                                <ListPlus size={14} />
                                <Select.ItemText>{list.name}</Select.ItemText>
                                <Select.ItemIndicator>
                                  <Check size={13} />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </label>
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
  onRemove?: () => void;
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
  const [failed, setFailed] = useState(false);

  const rangeLabel = new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${session?.start ?? day}T00:00:00Z`));

  async function submit() {
    setFailed(false);
    const totalMinutes =
      (Number(hours) || 0) * 60 + Math.min(59, Number(minutes) || 0);
    const saved = await onSave({
      minutes: totalMinutes > 0 ? totalMinutes : null,
      note,
      marksStart,
      marksFinish,
      spoilers,
      visibility,
    });
    if (!saved) setFailed(true);
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
      <label>
        <span>
          {tri(lang, "O que rolou na sessão", "What happened", "Qué pasó")}
        </span>
        <textarea
          maxLength={1000}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={tri(
            lang,
            "Conte o que você fez nesse dia.",
            "Tell what you did on this day.",
            "Cuenta lo que hiciste ese día.",
          )}
        />
      </label>
      <div className="social-form-row social-form-options">
        <label>
          <span>{t.visibility}</span>
          <EditorVisibilitySelect
            value={visibility}
            onChange={setVisibility}
            lang={lang}
          />
        </label>
        <label className="social-check">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(event) => setSpoilers(event.target.checked)}
          />
          <span>{t.containsSpoilers}</span>
        </label>
      </div>
      {failed && (
        <p className="social-form-error" role="alert">
          {tri(
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
            onClick={onRemove}
            disabled={pending}
          >
            <Trash2 size={14} /> {t.remove}
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
          {pending && <LoaderCircle className="spin" size={15} aria-hidden />}
          {pending
            ? t.saving
            : tri(lang, "Salvar sessão", "Save session", "Guardar sesión")}
        </button>
      </footer>
    </form>
  );
}
