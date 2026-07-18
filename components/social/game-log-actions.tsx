"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen,
  CalendarPlus,
  Flag,
  FlagTriangleRight,
  ListPlus,
  LoaderCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JourneyCalendar } from "./journey-calendar";
import {
  EditorVisibilitySelect,
  ReviewStudioForm,
  type ReviewRpcFields,
} from "./review-studio-form";

type Mode = "review" | "diary" | "list";
type ListOption = { id: string; name: string };

export function GameLogActions({
  game,
  platforms,
  lang,
  lists,
  logCount,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  platforms: string[];
  lang: "pt-BR" | "en";
  lists: ListOption[];
  logCount: number;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [diaryVisibility, setDiaryVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >("PUBLIC");
  const today = new Date().toISOString().slice(0, 10);
  const [journeyStart, setJourneyStart] = useState(today);
  const [journeyEnd, setJourneyEnd] = useState("");
  const [marksStart, setMarksStart] = useState(false);
  const [marksFinish, setMarksFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function submit(formData: FormData) {
    if (!mode || mode === "review" || pending) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    let result;
    if (mode === "diary") {
      const minutes = String(formData.get("minutes") ?? "");
      result = await supabase.rpc("save_diary_entry", {
        game_id: game.id,
        game_slug: game.slug,
        entry_date: journeyStart,
        entry_end: journeyEnd || null,
        entry_minutes: minutes ? Number(minutes) : null,
        entry_note: String(formData.get("note") ?? ""),
        spoilers: formData.get("spoilers") === "on",
        entry_visibility: formData.get("visibility"),
        entry_marks_start: marksStart,
        entry_marks_finish: marksFinish,
      });
    } else {
      result = await supabase.rpc("add_game_to_list", {
        target_list: formData.get("listId"),
        game_id: game.id,
        game_slug: game.slug,
      });
    }
    if (result.error) {
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
    diary: pt ? "Registrar jornada" : "Log journey",
    list: pt ? "Adicionar à lista" : "Add to list",
  };
  function openMode(nextMode: Mode) {
    setError(null);
    setSuccess(null);
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
          <CalendarPlus size={15} /> {labels.diary}
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
            {mode && mode !== "review" && (
              <form action={submit} className="social-editor-form">
                {mode === "diary" && (
                  <>
                    <JourneyCalendar
                      lang={lang}
                      start={journeyStart}
                      end={journeyEnd}
                      maxDate={today}
                      onChange={(range) => {
                        setJourneyStart(range.start);
                        setJourneyEnd(range.end);
                      }}
                    />
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
                            if (journeyEnd && journeyEnd < next)
                              setJourneyEnd("");
                          }}
                          required
                        />
                      </label>
                      <label>
                        <span>
                          {pt ? "Até (opcional)" : "Until (optional)"}
                        </span>
                        <input
                          type="date"
                          min={journeyStart || undefined}
                          max={today}
                          value={journeyEnd}
                          onChange={(event) =>
                            setJourneyEnd(event.target.value)
                          }
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
                        <Flag size={15} />
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
                        <FlagTriangleRight size={15} />
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
                    <div className="social-form-row">
                      <label>
                        <span>{pt ? "Minutos jogados" : "Minutes played"}</span>
                        <input
                          name="minutes"
                          type="number"
                          min={0}
                          max={100000}
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                    <label>
                      <span>{pt ? "O que rolou na jornada" : "What happened"}</span>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={5}
                        placeholder={
                          pt
                            ? "Conte o que você fez nesse dia ou intervalo de dias."
                            : "Tell what you did on this day or range of days."
                        }
                      />
                    </label>
                    <div
                      key={mode}
                      className="social-form-row social-form-options"
                    >
                      <label>
                        <span>{pt ? "Visibilidade" : "Visibility"}</span>
                        <EditorVisibilitySelect
                          value={diaryVisibility}
                          onChange={setDiaryVisibility}
                          pt={pt}
                        />
                      </label>
                      <label className="social-check">
                        <input type="checkbox" name="spoilers" />{" "}
                        <span>
                          {pt ? "Contém spoilers" : "Contains spoilers"}
                        </span>
                      </label>
                    </div>
                  </>
                )}
                {mode === "list" &&
                  (lists.length ? (
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
                  ))}
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
                    disabled={pending || (mode === "list" && !lists.length)}
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
