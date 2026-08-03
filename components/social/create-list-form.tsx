"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  LayoutGrid,
  Layers3,
  ListOrdered,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export function CreateListForm({
  lang,
  defaultOpen = false,
}: {
  lang: UiLang;
  defaultOpen?: boolean;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Format and ranking are independent: a collection can be ranked (numbered
  // best-to-worst) or not, and a tierlist ranks through its tiers instead.
  const [format, setFormat] = useState<"COLLECTION" | "TIERLIST">("COLLECTION");
  const [ranked, setRanked] = useState(false);
  // The RPC finishing is not the same as the new list being on screen; the
  // button stays busy until router.refresh() has re-rendered the grid.
  const [refreshing, startRefresh] = useTransition();
  const busy = pending || refreshing;

  function setDialogOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      const params = new URLSearchParams(window.location.search);
      if (!params.has("create")) return;
      params.delete("create");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    }
  }

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      setError(
        tri(
          lang,
          "Dê um nome à lista.",
          "Give the list a name.",
          "Dale un nombre a la lista.",
        ),
      );
      setPending(false);
      return;
    }
    const client = createClient();
    let { data: created, error: actionError } = await client.rpc(
      "create_game_list",
      {
        list_name: name,
        list_description: description || null,
        list_ranked: format === "COLLECTION" && ranked,
        list_kind: format,
      },
    );
    let droppedMode = false;
    if (
      actionError &&
      actionError.message.toLowerCase().includes("could not find the function")
    ) {
      // Older signature: the list still gets created, just always as a
      // collection, because the database predates the ranked_lists migration.
      droppedMode = true;
      ({ data: created, error: actionError } = await client.rpc(
        "create_game_list",
        {
          list_name: name,
          list_description: description || null,
        },
      ));
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
      // The list exists either way; saying so beats letting the author discover
      // later that the ranking they asked for is a plain collection.
      const halfApplied = droppedMode && format === "COLLECTION" && ranked;
      if (halfApplied)
        setError(
          tri(
            lang,
            "A lista foi criada como coleção: o banco ainda não tem a migração ranked_lists para o formato Ranking.",
            "The list was created as a collection: the database is missing the ranked_lists migration needed for Ranking format.",
            "La lista se creó como colección: la base de datos no tiene la migración ranked_lists para el formato Ranking.",
          ),
        );
      // A new tierlist opens straight into its editor, an empty board is
      // useless until games are dragged in.
      const row = Array.isArray(created) ? created[0] : created;
      const tierlistId =
        format === "TIERLIST" && row && "public_id" in row
          ? (row as { public_id: string }).public_id
          : null;
      startRefresh(() => {
        if (tierlistId) {
          router.push(`/${lang}/lists/${tierlistId}?edit=1`);
          return;
        }
        router.refresh();
        if (!halfApplied) setDialogOpen(false);
      });
    }
    setPending(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setDialogOpen}>
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
            <RadioGroup
              className="create-list-mode"
              name="format"
              value={format}
              onValueChange={(value) =>
                setFormat(value as "COLLECTION" | "TIERLIST")
              }
              render={<fieldset />}
            >
              <legend>{tri(lang, "Formato", "Format", "Formato")}</legend>
              <RadioGroupItem
                value="COLLECTION"
                data-selected={format === "COLLECTION" || undefined}
              >
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
                      "Jogos reunidos por tema.",
                      "Games grouped by theme.",
                      "Juegos reunidos por tema.",
                    )}
                  </small>
                </span>
              </RadioGroupItem>
              <RadioGroupItem
                value="TIERLIST"
                data-selected={format === "TIERLIST" || undefined}
              >
                <span>
                  <LayoutGrid size={17} aria-hidden />
                </span>
                <span>
                  <strong>Tierlist</strong>
                  <small>
                    {tri(
                      lang,
                      "Arraste os jogos da biblioteca para tiers de S a D.",
                      "Drag your library games into tiers from S to D.",
                      "Arrastra los juegos de la biblioteca a tiers de S a D.",
                    )}
                  </small>
                </span>
              </RadioGroupItem>
            </RadioGroup>
            {/* Ranking is a switch on top of a collection, not a format of its
                own: a tierlist already ranks through its tiers. */}
            {format === "COLLECTION" && (
              <div className="create-list-rank-toggle">
                <span>
                  <ListOrdered size={16} aria-hidden />
                  <span>
                    <strong>{tri(lang, "Ranquear", "Rank", "Ranquear")}</strong>
                    <small>
                      {tri(
                        lang,
                        "Numera do melhor ao pior; você define a posição.",
                        "Numbers from best to worst; you set the position.",
                        "Numera del mejor al peor; tú defines la posición.",
                      )}
                    </small>
                  </span>
                </span>
                <Switch
                  checked={ranked}
                  onCheckedChange={setRanked}
                  aria-label={tri(lang, "Ranquear", "Rank", "Ranquear")}
                />
              </div>
            )}
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
              <button type="submit" disabled={busy}>
                {busy && <LoaderCircle className="spin" size={15} />}
                {busy
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
