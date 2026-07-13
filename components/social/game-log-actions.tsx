"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, CalendarPlus, ListPlus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/components/library/star-rating";

type Mode = "review" | "diary" | "list";
type ListOption = { id: string; name: string };

export function GameLogActions({
  game,
  lang,
  lists,
  initialRating,
  initialReview,
  logCount,
}: {
  game: { id: number; slug: string; name: string; releaseYear: number | null };
  lang: "pt-BR" | "en";
  lists: ListOption[];
  initialRating: number | null;
  initialReview: {
    id: string;
    rating: number;
    content: string | null;
    contains_spoilers: boolean;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  } | null;
  logCount: number;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(
    initialReview?.rating ?? initialRating ?? 80,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(formData: FormData) {
    if (!mode || pending) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    let result;
    if (mode === "review") {
      result = await supabase.rpc("save_review", {
        game_id: game.id,
        game_slug: game.slug,
        review_rating: rating,
        review_content: String(formData.get("content") ?? ""),
        spoilers: formData.get("spoilers") === "on",
        review_visibility: formData.get("visibility"),
      });
    } else if (mode === "diary") {
      const minutes = String(formData.get("minutes") ?? "");
      result = await supabase.rpc("save_diary_entry", {
        game_id: game.id,
        game_slug: game.slug,
        entry_date: formData.get("playedOn"),
        entry_minutes: minutes ? Number(minutes) : null,
        entry_note: String(formData.get("note") ?? ""),
        spoilers: formData.get("spoilers") === "on",
        entry_visibility: formData.get("visibility"),
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
      window.setTimeout(() => setOpen(false), 420);
    }
    setPending(false);
  }

  async function removeReview() {
    if (
      !initialReview ||
      pending ||
      !window.confirm(pt ? "Remover esta avaliação?" : "Remove this review?")
    )
      return;
    setPending(true);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "delete_review",
      { review_id: initialReview.id },
    );
    if (actionError || data !== true)
      setError(
        pt
          ? "Não foi possível remover a avaliação."
          : "Could not remove the review.",
      );
    else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  const labels = {
    review: pt ? "Escrever avaliação" : "Write review",
    diary: pt ? "Registrar sessão" : "Log session",
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
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>{mode ? labels[mode] : ""}</span>
                <Dialog.Title>{game.name}</Dialog.Title>
              </div>
              {game.releaseYear && <time>{game.releaseYear}</time>}
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={19} />
              </Dialog.Close>
            </header>
            {(mode === "review" || mode === "diary") && (
              <nav
                className="game-editor-tabs"
                aria-label={pt ? "Tipo de registro" : "Entry type"}
              >
                <button
                  type="button"
                  data-active={mode === "review" || undefined}
                  onClick={() => setMode("review")}
                >
                  <BookOpen size={16} /> {pt ? "Avaliação" : "Review"}
                </button>
                <button
                  type="button"
                  data-active={mode === "diary" || undefined}
                  onClick={() => setMode("diary")}
                >
                  <CalendarPlus size={16} /> {pt ? "Diário" : "Journal"}
                </button>
              </nav>
            )}
            {mode && (
              <form action={submit} className="social-editor-form">
                {mode === "review" && (
                  <>
                    <label className="social-rating-field">
                      <span>{pt ? "Sua nota" : "Your rating"}</span>
                      <StarRating
                        value={rating}
                        onChange={(value) => value !== null && setRating(value)}
                        lang={lang}
                      />
                    </label>
                    <label>
                      <span>{pt ? "Avaliação" : "Review"}</span>
                      <textarea
                        name="content"
                        maxLength={5000}
                        rows={8}
                        defaultValue={initialReview?.content ?? ""}
                        placeholder={
                          pt
                            ? "O que funcionou? O que ficou com você?"
                            : "What worked? What stayed with you?"
                        }
                      />
                    </label>
                  </>
                )}
                {mode === "diary" && (
                  <>
                    <div className="social-form-row">
                      <label>
                        <span>{pt ? "Data" : "Date"}</span>
                        <input
                          name="playedOn"
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </label>
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
                      <span>{pt ? "Nota da sessão" : "Session note"}</span>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={6}
                        placeholder={
                          pt
                            ? "Registre onde parou ou como foi a sessão."
                            : "Note where you stopped or how the session went."
                        }
                      />
                    </label>
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
                {mode !== "list" && (
                  <div className="social-form-row social-form-options">
                    <label>
                      <span>{pt ? "Visibilidade" : "Visibility"}</span>
                      <select
                        name="visibility"
                        defaultValue={
                          mode === "review"
                            ? (initialReview?.visibility ?? "PUBLIC")
                            : "PUBLIC"
                        }
                      >
                        <option value="PUBLIC">
                          {pt ? "Público" : "Public"}
                        </option>
                        <option value="FOLLOWERS">
                          {pt ? "Seguidores" : "Followers"}
                        </option>
                        <option value="PRIVATE">
                          {pt ? "Privado" : "Private"}
                        </option>
                      </select>
                    </label>
                    <label className="social-check">
                      <input
                        type="checkbox"
                        name="spoilers"
                        defaultChecked={
                          mode === "review" && initialReview?.contains_spoilers
                        }
                      />{" "}
                      <span>
                        {pt ? "Contém spoilers" : "Contains spoilers"}
                      </span>
                    </label>
                  </div>
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
                  {mode === "review" && initialReview && (
                    <button
                      className="social-delete-button"
                      type="button"
                      onClick={removeReview}
                      disabled={pending}
                    >
                      <Trash2 size={14} /> {pt ? "Remover" : "Remove"}
                    </button>
                  )}
                  <Dialog.Close type="button">
                    {pt ? "Cancelar" : "Cancel"}
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={pending || (mode === "list" && !lists.length)}
                  >
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
