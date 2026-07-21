"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  Globe2,
  LoaderCircle,
  Lock,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function CreateListForm({ lang }: { lang: UiLang }) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibilityValue, setVisibilityValue] = useState("PUBLIC");

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient().rpc(
      "create_game_list",
      {
        list_name: formData.get("name"),
        list_description: formData.get("description"),
        list_visibility: formData.get("visibility"),
      },
    );
    if (actionError) {
      setError(
        tri(
          lang,
          "Não foi possível criar a lista.",
          "Could not create the list.",
          "No se pudo crear la lista.",
        ),
      );
    } else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
  }

  const visibility = [
    {
      value: "PUBLIC",
      label: tri(lang, "Pública", "Public", "Pública"),
      description: tri(
        lang,
        "Qualquer pessoa pode ver",
        "Anyone can view it",
        "Cualquiera puede verla",
      ),
      icon: Globe2,
    },
    {
      value: "FOLLOWERS",
      label: t.followers,
      description: tri(
        lang,
        "Visível para seguidores",
        "Visible to followers",
        "Visible para seguidores",
      ),
      icon: Users,
    },
    {
      value: "PRIVATE",
      label: tri(lang, "Privada", "Private", "Privada"),
      description: tri(
        lang,
        "Somente você pode ver",
        "Only you can view it",
        "Solo tú puedes verla",
      ),
      icon: Lock,
    },
  ];

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
            <label>
              <span>{t.visibility}</span>
              <Select.Root
                name="visibility"
                value={visibilityValue}
                onValueChange={setVisibilityValue}
              >
                <Select.Trigger className="create-list-select">
                  <Select.Value>
                    {
                      visibility.find((item) => item.value === visibilityValue)
                        ?.label
                    }
                  </Select.Value>
                  <Select.Icon>
                    <ChevronDown size={15} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="create-list-select-content"
                    position="popper"
                    sideOffset={6}
                  >
                    <Select.Viewport>
                      {visibility.map(
                        ({ value, label, description, icon: Icon }) => (
                          <Select.Item
                            className="create-list-select-item"
                            value={value}
                            key={value}
                          >
                            <Icon size={16} />
                            <span className="create-list-select-copy">
                              <Select.ItemText>{label}</Select.ItemText>
                              <small>{description}</small>
                            </span>
                            <Select.ItemIndicator>
                              <Check size={14} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ),
                      )}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
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
