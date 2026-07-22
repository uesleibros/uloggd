"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Layers3,
  ListOrdered,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

function createListErrorMessage(message: string, lang: UiLang) {
  const lower = message.toLowerCase();
  if (lower.includes("authentication required"))
    return tri(
      lang,
      "Entre na sua conta para criar listas.",
      "Sign in to create lists.",
      "Inicia sesión para crear listas.",
    );
  if (lower.includes("invalid name"))
    return tri(
      lang,
      "Nome precisa ter entre 1 e 100 caracteres.",
      "Name must have 1–100 characters.",
      "El nombre debe tener entre 1 y 100 caracteres.",
    );
  if (lower.includes("description too long"))
    return tri(
      lang,
      "Descrição passa de 500 caracteres.",
      "Description exceeds 500 characters.",
      "La descripción supera los 500 caracteres.",
    );
  return tri(
    lang,
    "Não foi possível criar a lista.",
    "Could not create the list.",
    "No se pudo crear la lista.",
  );
}

export function CreateListForm({ lang }: { lang: UiLang }) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"COLLECTION" | "RANKED">("COLLECTION");

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      setError(tri(lang, "Dê um nome à lista.", "Give the list a name.", "Dale un nombre a la lista."));
      setPending(false);
      return;
    }
    const client = createClient();
    let { error: actionError } = await client.rpc("create_game_list", {
      list_name: name,
      list_description: description || null,
      list_ranked: mode === "RANKED",
    });
    if (
      actionError &&
      actionError.message.toLowerCase().includes("could not find the function")
    ) {
      ({ error: actionError } = await client.rpc("create_game_list", {
        list_name: name,
        list_description: description || null,
      }));
    }
    if (actionError) {
      const localized = createListErrorMessage(actionError.message, lang);
      const generic =
        localized ===
        tri(
          lang,
          "Não foi possível criar a lista.",
          "Could not create the list.",
          "No se pudo crear la lista.",
        );
      setError(
        generic && actionError.message
          ? `${localized} (${actionError.message.slice(0, 120)})`
          : localized,
      );
    } else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="create-list-trigger" type="button">
          <Plus size={16} />{" "}
          {tri(lang, "Nova lista", "New list", "Nueva lista")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="create-list-overlay" />
        <Dialog.Content className="create-list-dialog">
          <header>
            <div>
              <span>
                {tri(lang, "NOVA COLEÇÃO", "NEW COLLECTION", "NUEVA COLECCIÓN")}
              </span>
              <Dialog.Title>
                {tri(lang, "Criar lista", "Create list", "Crear lista")}
              </Dialog.Title>
              <Dialog.Description>
                {tri(
                  lang,
                  "Dê um tema à sua seleção. Você adiciona e organiza os jogos depois.",
                  "Give your selection a theme. You can add and organize games later.",
                  "Dale un tema a tu selección. Añades y organizas los juegos después.",
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <form action={submit} className="create-list-form">
            <label>
              <span>{tri(lang, "Nome", "Name", "Nombre")}</span>
              <input
                name="name"
                required
                minLength={1}
                maxLength={100}
                autoFocus
                placeholder={tri(
                  lang,
                  "Ex.: RPGs inesquecíveis",
                  "E.g. Unforgettable RPGs",
                  "Ej.: RPGs inolvidables",
                )}
              />
            </label>
            <label>
              <span>
                {tri(lang, "Descrição", "Description", "Descripción")}
              </span>
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                placeholder={tri(
                  lang,
                  "O que conecta os jogos desta lista?",
                  "What connects the games in this list?",
                  "¿Qué conecta los juegos de esta lista?",
                )}
              />
            </label>
            <fieldset className="create-list-mode">
              <legend>{tri(lang, "Formato", "Format", "Formato")}</legend>
              <label data-selected={mode === "COLLECTION" || undefined}>
                <input
                  type="radio"
                  name="mode"
                  value="COLLECTION"
                  checked={mode === "COLLECTION"}
                  onChange={() => setMode("COLLECTION")}
                />
                <span>
                  <Layers3 size={17} aria-hidden />
                </span>
                <span>
                  <strong>
                    {tri(lang, "Coleção", "Collection", "Colección")}
                  </strong>
                  <small>
                    {tri(
                      lang,
                      "Jogos reunidos por tema, sem ordem obrigatória.",
                      "Games grouped by theme, no required order.",
                      "Juegos reunidos por tema, sin orden obligatorio.",
                    )}
                  </small>
                </span>
              </label>
              <label data-selected={mode === "RANKED" || undefined}>
                <input
                  type="radio"
                  name="mode"
                  value="RANKED"
                  checked={mode === "RANKED"}
                  onChange={() => setMode("RANKED")}
                />
                <span>
                  <ListOrdered size={17} aria-hidden />
                </span>
                <span>
                  <strong>
                    {tri(lang, "Ranking", "Ranking", "Ranking")}
                  </strong>
                  <small>
                    {tri(
                      lang,
                      "Ordem importa: 1º, 2º, 3º… você define a posição.",
                      "Order matters: 1st, 2nd, 3rd… you set the position.",
                      "El orden importa: 1º, 2º, 3º… tú defines la posición.",
                    )}
                  </small>
                </span>
              </label>
            </fieldset>
            <p className="create-list-hint">
              {tri(
                lang,
                "Visibilidade e comentários ficam nas configurações da lista após criar.",
                "Visibility and comments live in the list settings after you create it.",
                "La visibilidad y los comentarios están en la configuración de la lista tras crearla.",
              )}
            </p>
            {error && <p role="alert">{error}</p>}
            <footer>
              <Dialog.Close type="button">{t.cancel}</Dialog.Close>
              <button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="spin" size={15} />}
                {pending
                  ? tri(lang, "Criando…", "Creating…", "Creando…")
                  : tri(lang, "Criar lista", "Create list", "Crear lista")}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
