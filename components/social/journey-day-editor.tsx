"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Clock3,
  Flag,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  entryTimeInputValue,
  formatEntryTime,
  JOURNAL_DAY_ENTRY_LIMIT,
} from "@/lib/journal-entry";
import { JournalImageEditor, useJournalImages } from "./journal-image-editor";
import { formatSessionTime, type JourneySession } from "./journey-calendar";
import { EditorVisibilitySelect } from "./review-studio-form";
import {
  CommunityScopeSelect,
  type CommunityScope,
} from "./community-scope-select";
import { CommunityTextArea } from "./comment-parts";
import type { DayPayload, SaveOutcome, Visibility } from "./journey-types";

/**
 * One day of the journal. A day can hold several entries, a morning run and a
 * late-night session are two records, not one averaged blob, so opening a day
 * lists what is already there and offers to add one more.
 */
export function JourneyDaySheet({
  day,
  sessions,
  journeyTitle,
  lang,
  pending,
  onBack,
  onEdit,
  onCreate,
  onRemoveDay,
}: {
  day: string;
  sessions: JourneySession[];
  journeyTitle: string;
  lang: UiLang;
  pending: boolean;
  onBack: () => void;
  onEdit: (session: JourneySession) => void;
  onCreate: () => void;
  onRemoveDay: () => Promise<boolean>;
}) {
  const t = uiText(lang);
  const [dayArmed, setDayArmed] = useState(false);
  const [dayRemoving, setDayRemoving] = useState(false);
  const [dayFailed, setDayFailed] = useState(false);
  const dayDisarmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (dayDisarmTimer.current) window.clearTimeout(dayDisarmTimer.current);
    },
    [],
  );

  async function removeDay() {
    if (pending || dayRemoving || !sessions.length) return;
    if (!dayArmed) {
      setDayArmed(true);
      if (dayDisarmTimer.current) window.clearTimeout(dayDisarmTimer.current);
      dayDisarmTimer.current = window.setTimeout(
        () => setDayArmed(false),
        4000,
      );
      return;
    }
    if (dayDisarmTimer.current) window.clearTimeout(dayDisarmTimer.current);
    setDayArmed(false);
    setDayRemoving(true);
    setDayFailed(false);
    if (!(await onRemoveDay())) {
      setDayRemoving(false);
      setDayFailed(true);
    }
  }

  const dayLabel = new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
  const dayMinutes = sessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const full = sessions.length >= JOURNAL_DAY_ENTRY_LIMIT;

  return (
    <div className="social-editor-form journey-day-sheet">
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
          <strong>{dayLabel}</strong>
        </div>
        {dayMinutes > 0 && (
          <em>
            <Clock3 size={12} /> {formatSessionTime(dayMinutes)}
          </em>
        )}
      </div>
      {sessions.length ? (
        <ol className="journey-day-entries" aria-busy={pending || undefined}>
          {sessions.map((session, index) => {
            const clock = formatEntryTime(session.startedAt, lang);
            const length = formatSessionTime(session.minutes);
            return (
              <li key={session.id}>
                <button
                  type="button"
                  disabled={pending || session.id.startsWith("temp-")}
                  onClick={() => onEdit(session)}
                >
                  <b>{clock ?? String(index + 1).padStart(2, "0")}</b>
                  <span>
                    <strong>
                      {session.note?.trim() ||
                        tri(
                          lang,
                          "Registro sem anotação",
                          "Entry without a note",
                          "Registro sin nota",
                        )}
                    </strong>
                    <small>
                      {[
                        length,
                        session.marksStart &&
                          tri(lang, "Início", "Start", "Inicio"),
                        session.marksFinish &&
                          tri(lang, "Fim", "Finish", "Fin"),
                        session.spoilers && "spoilers",
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        tri(
                          lang,
                          "Sem tempo registrado",
                          "No time logged",
                          "Sin tiempo registrado",
                        )}
                    </small>
                  </span>
                  <Pencil size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="social-empty-inline">
          {tri(
            lang,
            "Nenhum registro nesse dia ainda.",
            "Nothing logged on this day yet.",
            "Todavía no hay registros ese día.",
          )}
        </p>
      )}
      {dayFailed && (
        <p className="social-form-error" role="alert">
          {tri(
            lang,
            "Não foi possível excluir os registros desse dia.",
            "Could not delete this day's entries.",
            "No se pudieron eliminar los registros de ese día.",
          )}
        </p>
      )}
      <footer className="journey-day-actions">
        {sessions.length > 0 && (
          <button
            type="button"
            className="journey-day-remove"
            onClick={() => void removeDay()}
            disabled={pending}
            data-armed={dayArmed || undefined}
            aria-busy={dayRemoving}
          >
            {dayRemoving ? (
              <LoaderCircle className="spin" size={14} aria-hidden />
            ) : (
              <Trash2 size={14} />
            )}{" "}
            {dayRemoving
              ? tri(lang, "Excluindo…", "Deleting…", "Eliminando…")
              : dayArmed
                ? tri(
                    lang,
                    `Excluir os ${sessions.length} registros?`,
                    `Delete all ${sessions.length} entries?`,
                    `¿Eliminar los ${sessions.length} registros?`,
                  )
                : tri(
                    lang,
                    "Excluir o dia",
                    "Delete the day",
                    "Eliminar el día",
                  )}
          </button>
        )}
        <button type="button" onClick={onBack} disabled={pending}>
          {t.back}
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={pending || full}
          data-primary
        >
          <Plus size={14} />
          {sessions.length
            ? tri(
                lang,
                "Novo registro nesse dia",
                "New entry on this day",
                "Nuevo registro ese día",
              )
            : tri(
                lang,
                "Registrar esse dia",
                "Log this day",
                "Registrar este día",
              )}
        </button>
      </footer>
    </div>
  );
}

export function JourneyEntryEditor({
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
  onSave: (
    payload: DayPayload,
    commitImages: (entryId: string) => Promise<boolean>,
  ) => Promise<SaveOutcome>;
  onRemove?: () => Promise<boolean>;
}) {
  const t = uiText(lang);
  const images = useJournalImages(session?.id ?? null);
  const [time, setTime] = useState(entryTimeInputValue(session?.startedAt));
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
  // Owned here rather than read from the parent's `pending`: the form action
  // runs inside a transition, so the parent's flag is a low-priority update and
  // the button could sit there looking idle through a multi-image upload.
  const [saving, setSaving] = useState(false);
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
    if (saving) return;
    setFailure(null);
    setSaving(true);
    const totalMinutes =
      (Number(hours) || 0) * 60 + Math.min(59, Number(minutes) || 0);
    const saved = await onSave(
      {
        minutes: totalMinutes > 0 ? totalMinutes : null,
        time,
        note,
        marksStart,
        marksFinish,
        spoilers,
        visibility,
        commentsScope,
      },
      images.commit,
    );
    // "images" already surfaced its own message inside the gallery editor, and
    // the entry is stored, so it must not claim the session failed to save.
    if (saved === "failed") setFailure("save");
    // On "saved" the editor is unmounting; leaving the spinner up avoids a
    // flash of the idle label on the way out.
    if (saved !== "saved") setSaving(false);
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
    /* A plain submit handler, not `action={submit}`: React runs a form action
       inside a transition, which makes the `saving` flag a deferred update and
       let the button sit there looking idle through a long image upload. */
    <form
      className="social-editor-form journey-day-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
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
      {/* The hour is optional: a day is enough for most entries, and only
          people who log several sessions a day need to tell them apart. */}
      <div className="journey-clock-field">
        <label htmlFor="diary-time">
          <span>{tri(lang, "Horário", "Time of day", "Hora")}</span>
          <small>{tri(lang, "opcional", "optional", "opcional")}</small>
        </label>
        <div>
          <input
            id="diary-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          {time && (
            <button
              type="button"
              data-quiet
              onClick={() => setTime("")}
              aria-label={tri(
                lang,
                "Remover horário",
                "Remove time of day",
                "Quitar la hora",
              )}
            >
              <X size={14} />
            </button>
          )}
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
      <JournalImageEditor
        state={images}
        lang={lang}
        disabled={pending || saving}
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
        <button type="button" onClick={onBack} disabled={pending || saving}>
          {t.back}
        </button>
        <button
          type="submit"
          aria-busy={saving}
          data-loading={saving || undefined}
          disabled={pending || saving}
        >
          {saving && <LoaderCircle className="spin" size={15} aria-hidden />}
          {saving
            ? t.saving
            : tri(lang, "Salvar sessão", "Save session", "Guardar sesión")}
        </button>
      </footer>
    </form>
  );
}
