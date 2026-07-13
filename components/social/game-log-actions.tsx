"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, CalendarPlus, ListPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
}: {
  game: { id: number; slug: string; name: string };
  lang: "pt-BR" | "en";
  lists: ListOption[];
  initialRating: number | null;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [rating, setRating] = useState(initialRating ?? 80);
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
      window.setTimeout(() => setMode(null), 650);
    }
    setPending(false);
  }

  const labels = {
    review: pt ? "Escrever avaliação" : "Write review",
    diary: pt ? "Registrar sessão" : "Log session",
    list: pt ? "Adicionar à lista" : "Add to list",
  };

  return (
    <>
      <div className="game-log-actions">
        <button type="button" onClick={() => setMode("review")}>
          <BookOpen size={15} /> {labels.review}
        </button>
        <button type="button" onClick={() => setMode("diary")}>
          <CalendarPlus size={15} /> {labels.diary}
        </button>
        <button type="button" onClick={() => setMode("list")}>
          <ListPlus size={15} /> {labels.list}
        </button>
      </div>
      <Dialog.Root
        open={Boolean(mode)}
        onOpenChange={(open) => !open && setMode(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>{game.name}</span>
                <Dialog.Title>{mode ? labels[mode] : ""}</Dialog.Title>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={19} />
              </Dialog.Close>
            </header>
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
                      <select name="visibility" defaultValue="PUBLIC">
                        <option value="PUBLIC">
                          {pt ? "Público" : "Public"}
                        </option>
                        <option value="PRIVATE">
                          {pt ? "Privado" : "Private"}
                        </option>
                      </select>
                    </label>
                    <label className="social-check">
                      <input type="checkbox" name="spoilers" />{" "}
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
