"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Flag, LoaderCircle, Pencil, Play, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SocialEntry } from "./activity-stream";
import { EditReviewDialog } from "./edit-review-dialog";
import { EditorVisibilitySelect } from "./review-studio-form";

export function ActivityEntryActions({
  entry,
  lang,
}: {
  entry: SocialEntry;
  lang: "pt-BR" | "en";
}) {
  const { id, kind } = entry;
  const pt = lang === "pt-BR";
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
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
      setError(pt ? "Não foi possível remover." : "Could not remove.");
      setPending(false);
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
        pt
          ? "Não foi possível atualizar a sessão."
          : "Could not update the session.",
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
          <Pencil size={14} /> {pt ? "Editar" : "Edit"}
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
            ? pt
              ? "Removendo…"
              : "Removing…"
            : armed
              ? pt
                ? "Remover mesmo?"
                : "Really remove?"
              : pt
                ? "Remover"
                : "Remove"}
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
                  <span>{pt ? "JORNADA" : "JOURNEY"}</span>
                  <Dialog.Title>
                    {pt ? "Editar jornada" : "Edit journey"}
                  </Dialog.Title>
                </div>
                <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                  <X size={19} />
                </Dialog.Close>
              </header>
              <form action={update} className="social-editor-form">
                <div className="social-form-row journey-date-fields">
                  <label>
                    <span>{pt ? "De" : "From"}</span>
                    <input
                      type="date"
                      max={journeyEnd || today}
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
                    <span>{pt ? "Até (opcional)" : "Until (optional)"}</span>
                    <input
                      type="date"
                      min={journeyStart || undefined}
                      max={today}
                      value={journeyEnd}
                      onChange={(event) => setJourneyEnd(event.target.value)}
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
                        {pt ? "Comecei o jogo aqui" : "Started the game here"}
                      </strong>
                      <small>
                        {pt
                          ? "Marca o início da jornada"
                          : "Marks the journey start"}
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
                        {pt
                          ? "Marca o fim da jornada"
                          : "Marks the journey end"}
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
                        value={hoursValue}
                        onChange={(event) => setHoursValue(event.target.value)}
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
                        value={minutesValue}
                        onChange={(event) =>
                          setMinutesValue(event.target.value)
                        }
                      />
                      <small>{pt ? "minutos" : "minutes"}</small>
                    </label>
                  </div>
                </div>
                <label>
                  <span>{pt ? "O que rolou na jornada" : "What happened"}</span>
                  <textarea
                    name="note"
                    maxLength={1000}
                    rows={5}
                    defaultValue={entry.content ?? ""}
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
                      name="spoilers"
                      defaultChecked={entry.spoilers}
                    />
                    <span>{pt ? "Contém spoilers" : "Contains spoilers"}</span>
                  </label>
                </div>
                {error && (
                  <p className="social-form-error" role="alert">
                    {error}
                  </p>
                )}
                <footer>
                  <Dialog.Close type="button">
                    {pt ? "Cancelar" : "Cancel"}
                  </Dialog.Close>
                  <button type="submit" disabled={pending}>
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
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
