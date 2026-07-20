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
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

type Mode = "review" | "diary" | "list";
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
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: "pt-BR" | "en";
  lists: ListOption[];
  logCount: number;
  journeys?: JourneySession[];
  journeyOptions?: JourneyOption[];
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
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
        setError(pt ? "Não foi possível renomear." : "Could not rename.");
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
        pt ? "Não foi possível criar a jornada." : "Could not create journey.",
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
      setError(pt ? "Não foi possível excluir." : "Could not delete.");
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
      setError(pt ? "Não foi possível salvar." : "Could not save.");
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
      setError(pt ? "Não foi possível remover." : "Could not remove.");
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
        pt
          ? "Não foi possível salvar. Confira os campos e tente novamente."
          : "Could not save. Check the fields and try again.",
      );
    } else {
      setSuccess(pt ? "Salvo na sua jornada." : "Saved to your journey.");
      router.refresh();
      window.setTimeout(() => {
        setOpen(false);
      }, 420);
    }
    setPending(false);
  }

  const labels = {
    review: pt ? "Nova avaliação" : "New review",
    diary: pt ? "Sua jornada" : "Your journey",
    list: pt ? "Adicionar à lista" : "Add to list",
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
          <CalendarPlus size={15} /> {pt ? "Registrar jornada" : "Log journey"}
        </button>
        {logCount > 0 && (
          <Link href={`/${lang}/game/${game.slug}/logs`}>
            {pt ? `Ver registros (${logCount})` : `View logs (${logCount})`}
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
              <Dialog.Close
                aria-label={pt ? "Fechar" : "Close"}
                disabled={pending}
              >
                <X size={19} />
              </Dialog.Close>
            </header>
            {mode === "review" && (
              <ReviewStudioForm
                lang={lang}
                platforms={platforms}
                journeyOptions={journeyList}
                draftKey={`uloggd:review-draft:${game.id}`}
                submitLabel={pt ? "Publicar avaliação" : "Publish review"}
                busyLabel={pt ? "Publicando…" : "Publishing…"}
                successLabel={
                  pt ? "Salvo na sua jornada." : "Saved to your journey."
                }
                onPerform={performReview}
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
                      {pt ? "Sessões avulsas" : "Loose sessions"}
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
                    <Plus size={12} /> {pt ? "Nova jornada" : "New journey"}
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
                      <Pencil size={12} /> {pt ? "Renomear" : "Rename"}
                    </button>
                    <button
                      type="button"
                      data-armed={journeyArmed || undefined}
                      onClick={deleteJourney}
                      disabled={pending}
                    >
                      <Trash2 size={12} />{" "}
                      {journeyArmed
                        ? pt
                          ? "Excluir jornada e sessões?"
                          : "Delete journey and sessions?"
                        : pt
                          ? "Excluir"
                          : "Delete"}
                    </button>
                  </div>
                )}
                {namingOpen && (
                  <div className="journey-naming">
                    <span>
                      {naming === "rename"
                        ? pt
                          ? "Renomear jornada"
                          : "Rename journey"
                        : pt
                          ? "Dê um nome à sua jornada"
                          : "Name your journey"}
                    </span>
                    <div>
                      <input
                        value={namingTitle}
                        maxLength={80}
                        placeholder={
                          pt
                            ? "ex: Primeira campanha, Replay 2026…"
                            : "e.g. First playthrough, 2026 replay…"
                        }
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
                          ? pt
                            ? "Salvar"
                            : "Save"
                          : pt
                            ? "Criar"
                            : "Create"}
                      </button>
                      {naming !== null && selectedJourney !== null && (
                        <button
                          type="button"
                          data-quiet
                          onClick={() => setNaming(null)}
                        >
                          {pt ? "Cancelar" : "Cancel"}
                        </button>
                      )}
                    </div>
                    {selectedJourney === null && (
                      <p>
                        {pt
                          ? "Cada jornada é uma passagem pelo jogo — você pode criar quantas quiser e registrar as sessões de cada uma."
                          : "Each journey is one playthrough — create as many as you want and log each one's sessions."}
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
                        <span>{pt ? "Abrir um dia" : "Open a day"}</span>
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
                        {pt ? "Abrir" : "Open"}
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
                    {pt ? "Concluído" : "Done"}
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
                  (pt ? "Sessões avulsas" : "Loose sessions")
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
                    <span>{pt ? "Lista" : "List"}</span>
                    <Select.Root
                      value={listChoice}
                      onValueChange={setListChoice}
                    >
                      <Select.Trigger className="editor-select-trigger">
                        <Select.Value
                          placeholder={
                            pt ? "Selecione uma lista" : "Select a list"
                          }
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
                    {pt
                      ? "Crie uma lista primeiro na página de listas."
                      : "Create a list on the lists page first."}
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
                    {pt ? "Cancelar" : "Cancel"}
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
                    {pending
                      ? pt
                        ? "Salvando…"
                        : "Saving…"
                      : pt
                        ? "Salvar"
                        : "Save"}
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
  lang: "pt-BR" | "en";
  pending: boolean;
  onBack: () => void;
  onSave: (payload: DayPayload) => Promise<boolean>;
  onRemove?: () => void;
}) {
  const pt = lang === "pt-BR";
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
          aria-label={pt ? "Voltar ao calendário" : "Back to calendar"}
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
              {pt ? "Comecei o jogo aqui" : "Started the game here"}
            </strong>
            <small>
              {pt ? "Marca o início da jornada" : "Marks the journey start"}
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
              {pt ? "Terminei o jogo aqui" : "Finished the game here"}
            </strong>
            <small>
              {pt ? "Marca o fim da jornada" : "Marks the journey end"}
            </small>
          </span>
        </button>
      </div>
      <div className="journey-time-fields">
        <span>{pt ? "Tempo jogado" : "Time played"}</span>
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
            <small>{pt ? "horas" : "hours"}</small>
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
            <small>{pt ? "minutos" : "minutes"}</small>
          </label>
        </div>
      </div>
      <label>
        <span>{pt ? "O que rolou na sessão" : "What happened"}</span>
        <textarea
          maxLength={1000}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            pt
              ? "Conte o que você fez nesse dia."
              : "Tell what you did on this day."
          }
        />
      </label>
      <div className="social-form-row social-form-options">
        <label>
          <span>{pt ? "Visibilidade" : "Visibility"}</span>
          <EditorVisibilitySelect
            value={visibility}
            onChange={setVisibility}
            pt={pt}
          />
        </label>
        <label className="social-check">
          <input
            type="checkbox"
            checked={spoilers}
            onChange={(event) => setSpoilers(event.target.checked)}
          />
          <span>{pt ? "Contém spoilers" : "Contains spoilers"}</span>
        </label>
      </div>
      {failed && (
        <p className="social-form-error" role="alert">
          {pt
            ? "Não foi possível salvar a sessão."
            : "Could not save the session."}
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
            <Trash2 size={14} /> {pt ? "Remover" : "Remove"}
          </button>
        )}
        <button type="button" onClick={onBack} disabled={pending}>
          {pt ? "Voltar" : "Back"}
        </button>
        <button
          type="submit"
          aria-busy={pending}
          data-loading={pending || undefined}
          disabled={pending}
        >
          {pending && <LoaderCircle className="spin" size={15} aria-hidden />}
          {pending
            ? pt
              ? "Salvando…"
              : "Saving…"
            : pt
              ? "Salvar sessão"
              : "Save session"}
        </button>
      </footer>
    </form>
  );
}
