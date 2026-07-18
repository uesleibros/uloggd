"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  BookOpen,
  CalendarPlus,
  Flag,
  ListPlus,
  LoaderCircle,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JourneyCalendar, type JourneySession } from "./journey-calendar";
import {
  EditorVisibilitySelect,
  ReviewStudioForm,
  type ReviewRpcFields,
} from "./review-studio-form";

type Mode = "review" | "diary" | "list";
type ListOption = { id: string; name: string };
type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
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
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: "pt-BR" | "en";
  lists: ListOption[];
  logCount: number;
  journeys?: JourneySession[];
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [sessions, setSessions] = useState(journeys);
  const [prevJourneys, setPrevJourneys] = useState(journeys);
  if (journeys !== prevJourneys) {
    setPrevJourneys(journeys);
    setSessions(journeys);
    setPending(false);
  }
  const [dayEditor, setDayEditor] = useState<{
    day: string;
    session: JourneySession | null;
  } | null>(null);
  const [openDayValue, setOpenDayValue] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function sessionFor(day: string) {
    return (
      sessions.find(
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

  function openDay(day: string, session: JourneySession | null) {
    if (pending || session?.id.startsWith("temp-")) return;
    setError(null);
    setDayEditor({ day, session });
  }

  async function bulkAdd(days: string[]) {
    if (pending) return;
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
      })),
    ]);
    const { error: rpcError } = await createClient().rpc(
      "bulk_save_diary_days",
      { game_id: game.id, game_slug: game.slug, days: fresh },
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
    if (pending) return;
    const daySet = new Set(days);
    const hit = (session: JourneySession) => {
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
      { game_id: game.id, days },
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
    const { error: rpcError } = await createClient().rpc(
      "delete_diary_entry",
      { entry_id: dayEditor.session.id },
    );
    if (rpcError) {
      setPending(false);
      return;
    }
    setDayEditor(null);
    router.refresh();
  }

  async function submitList(formData: FormData) {
    if (pending) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const { error: rpcError } = await createClient().rpc("add_game_to_list", {
      target_list: formData.get("listId"),
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
    setMode(nextMode);
    setOpen(true);
  }

  return (
    <>
      <div className="game-log-actions">
        <button type="button" onClick={() => openMode("review")}>
          <BookOpen size={15} /> {labels.review}
        </button>
        <button type="button" onClick={() => openMode("diary")}>
          <CalendarPlus size={15} />{" "}
          {pt ? "Registrar jornada" : "Log journey"}
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
                draftKey={`uloggd:review-draft:${game.id}`}
                submitLabel={pt ? "Publicar avaliação" : "Publish review"}
                busyLabel={pt ? "Publicando…" : "Publishing…"}
                successLabel={pt ? "Salvo na sua jornada." : "Saved to your journey."}
                onPerform={performReview}
              />
            )}
            {mode === "diary" && !dayEditor && (
              <div className="social-editor-form journey-editor">
                <JourneyCalendar
                  lang={lang}
                  maxDate={today}
                  sessions={sessions}
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
                      onChange={(event) => setOpenDayValue(event.target.value)}
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
                    <select name="listId" required>
                      {lists.map((list) => (
                        <option value={list.id} key={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
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
                    disabled={pending || !lists.length}
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
  lang,
  pending,
  onBack,
  onSave,
  onRemove,
}: {
  day: string;
  session: JourneySession | null;
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
  const [marksFinish, setMarksFinish] = useState(
    Boolean(session?.marksFinish),
  );
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
          <span>
            {session
              ? pt
                ? "EDITAR SESSÃO"
                : "EDIT SESSION"
              : pt
                ? "NOVA SESSÃO"
                : "NEW SESSION"}
          </span>
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
            <strong>{pt ? "Comecei o jogo aqui" : "Started the game here"}</strong>
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
          {pt ? "Não foi possível salvar a sessão." : "Could not save the session."}
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
