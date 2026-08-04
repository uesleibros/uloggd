"use client";

import { Checkbox } from "@/components/ui/checkbox";

import * as Dialog from "@/components/ui/dialog";
import { Flag, LoaderCircle, Pencil, Play, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocalToday } from "@/components/use-local-today";
import { entryTimeInputValue } from "@/lib/journal-entry";
import type { SocialEntry } from "./activity-stream";
import { EditReviewDialog } from "./edit-review-dialog";
import { EditorVisibilitySelect } from "./review-studio-form";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { requestXpRefresh } from "@/lib/xp-feedback";

export function ActivityEntryActions({
  entry,
  lang,
  afterDelete,
}: {
  entry: SocialEntry;
  lang: UiLang;
  /**
   * Where to go once the entry is gone. In a feed the row simply disappears,
   * so refreshing in place is right; on the entry's own page refreshing leaves
   * the author staring at a page whose subject no longer exists, so those
   * callers pass the destination to leave for.
   */
  afterDelete?: string;
}) {
  const { id, kind } = entry;
  const t = uiText(lang);
  const router = useRouter();
  const today = useLocalToday();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    },
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [journeyStart, setJourneyStart] = useState(entry.playedOn ?? today);
  const [journeyEnd, setJourneyEnd] = useState(entry.endedOn ?? "");
  const [startedAt, setStartedAt] = useState(
    entryTimeInputValue(entry.startedAt),
  );
  const [marksStart, setMarksStart] = useState(Boolean(entry.marksStart));
  const [marksFinish, setMarksFinish] = useState(Boolean(entry.marksFinish));
  const [visibility, setVisibility] = useState(entry.visibility);
  const totalMinutes = entry.minutes ?? 0;
  const [hoursValue, setHoursValue] = useState(
    totalMinutes >= 60 ? String(Math.floor(totalMinutes / 60)) : "",
  );
  const [minutesValue, setMinutesValue] = useState(
    totalMinutes % 60 ? String(totalMinutes % 60) : "",
  );
  async function remove() {
    if (pending) return;
    if (!armed) {
      setArmed(true);
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
      disarmTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    setArmed(false);
    setPending(true);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      kind === "review" ? "delete_review" : "delete_diary_entry",
      kind === "review" ? { review_id: id } : { entry_id: id },
    );
    if (actionError || data !== true) {
      setError(t.couldNotRemove);
      setPending(false);
      return;
    }
    requestXpRefresh(false);
    if (afterDelete) {
      router.replace(afterDelete);
      router.refresh();
      return;
    }
    router.refresh();
  }
  async function update(formData: FormData) {
    setPending(true);
    setError(null);
    const total =
      (Number(hoursValue) || 0) * 60 + Math.min(59, Number(minutesValue) || 0);
    const { error: actionError } = await createClient().rpc(
      "update_diary_entry",
      {
        entry_id: id,
        entry_date: journeyStart,
        entry_end: journeyEnd || null,
        entry_time: startedAt ? `${startedAt}:00` : null,
        entry_minutes: total > 0 ? total : null,
        entry_note: formData.get("note"),
        spoilers: formData.get("spoilers") === "on",
        entry_visibility: visibility,
        entry_marks_start: marksStart,
        entry_marks_finish: marksFinish,
      },
    );
    if (actionError)
      setError(
        tri(
          lang,
          "Não foi possível atualizar a sessão.",
          "Could not update the session.",
          "No se pudo actualizar la sesión.",
        ),
      );
    else {
      setEditing(false);
      router.refresh();
    }
    setPending(false);
  }
  return (
    <>
      <div className="activity-entry-actions">
        <button type="button" onClick={() => setEditing(true)}>
          <Pencil size={14} /> {t.edit}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          data-armed={armed || undefined}
        >
          {pending ? (
            <LoaderCircle className="spin" size={14} aria-hidden />
          ) : (
            <Trash2 size={14} />
          )}{" "}
          {pending
            ? t.removing
            : armed
              ? tri(
                  lang,
                  "Remover mesmo?",
                  "Really remove?",
                  "¿Quitar de verdad?",
                )
              : t.remove}
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
      {kind === "review" && (
        <EditReviewDialog
          entry={entry}
          lang={lang}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
      {kind === "diary" && (
        <Dialog.Root open={editing} onOpenChange={setEditing}>
          <Dialog.Portal>
            <Dialog.Overlay className="drawer-backdrop" />
            <Dialog.Content
              className="social-editor-dialog"
              aria-describedby={undefined}
            >
              <header>
                <div>
                  <Dialog.Title>
                    {tri(
                      lang,
                      "Editar jornada",
                      "Edit journey",
                      "Editar recorrido",
                    )}
                  </Dialog.Title>
                </div>
                <Dialog.Close aria-label={t.close}>
                  <X size={19} />
                </Dialog.Close>
              </header>
              <form action={update} className="social-editor-form">
                <div className="social-form-row journey-date-fields">
                  <label>
                    <span>{t.from}</span>
                    <input
                      type="date"
                      max={journeyEnd || today || undefined}
                      value={journeyStart}
                      onChange={(event) => {
                        const next = event.target.value;
                        setJourneyStart(next);
                        if (journeyEnd && journeyEnd < next) setJourneyEnd("");
                      }}
                      required
                    />
                  </label>
                  <label>
                    <span>
                      {tri(
                        lang,
                        "Até (opcional)",
                        "Until (optional)",
                        "Hasta (opcional)",
                      )}
                    </span>
                    <input
                      type="date"
                      min={journeyStart || undefined}
                      max={today || undefined}
                      value={journeyEnd}
                      onChange={(event) => setJourneyEnd(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>
                      {tri(
                        lang,
                        "Horário (opcional)",
                        "Time of day (optional)",
                        "Hora (opcional)",
                      )}
                    </span>
                    <input
                      type="time"
                      value={startedAt}
                      onChange={(event) => setStartedAt(event.target.value)}
                    />
                  </label>
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
                  <span>
                    {tri(lang, "Tempo jogado", "Time played", "Tiempo jugado")}
                  </span>
                  <div>
                    <label>
                      <input
                        type="number"
                        min={0}
                        max={24}
                        inputMode="numeric"
                        placeholder="0"
                        value={hoursValue}
                        onChange={(event) => setHoursValue(event.target.value)}
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
                        value={minutesValue}
                        onChange={(event) =>
                          setMinutesValue(event.target.value)
                        }
                      />
                      <small>
                        {tri(lang, "minutos", "minutes", "minutos")}
                      </small>
                    </label>
                  </div>
                </div>
                <label>
                  <span>
                    {tri(
                      lang,
                      "O que rolou na jornada",
                      "What happened",
                      "Qué pasó",
                    )}
                  </span>
                  <textarea
                    name="note"
                    maxLength={1000}
                    rows={5}
                    defaultValue={entry.content ?? ""}
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
                    <Checkbox name="spoilers" defaultChecked={entry.spoilers} />
                    <span>{t.containsSpoilers}</span>
                  </label>
                </div>
                {error && (
                  <p className="social-form-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                  <button type="submit" disabled={pending}>
                    {pending && (
                      <LoaderCircle className="spin" size={15} aria-hidden />
                    )}
                    {pending ? t.saving : t.save}
                  </button>
                </footer>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
