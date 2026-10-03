"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@/components/ui/dialog";
import { Plus, X, LoaderCircle, Trophy } from "lucide-react";
import { api } from "@/lib/api-client";
import { awardPreset, parseAward, type AwardDocument } from "@/lib/awards";
import { AwardSettings } from "./award-settings";
import { AwardSelect } from "./award-select";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function AwardCreate({ lang, year }: { lang: UiLang; year: number }) {
  const t = uiText(lang);
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<AwardDocument | null>(null);
  const [preset, setPreset] = useState("personal");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const title = tri(lang, "Nova premiação", "New awards", "Nueva premiación");
  function start() {
    setDoc({
      name: "",
      year,
      mode: "PERSONAL",
      rules: "",
      source: "CATALOG",
      source_list_id: null,
      visibility: "PUBLIC",
      status: "DRAFT",
      categories: awardPreset("personal", lang, () => crypto.randomUUID()),
    });
    setPreset("personal");
    setSourceName(null);
    setError(null);
    setOpen(true);
  }
  async function create() {
    if (!doc || pending) return;
    setError(null);
    setPending(true);
    try {
      const value = parseAward({
        ...doc,
        categories: awardPreset(
          preset as "personal" | "tga" | "blank",
          lang,
          () => crypto.randomUUID(),
        ),
      });
      const answer = await api.post<{ data: { public_id: string } }>(
        "/awards",
        value,
      );
      setOpen(false);
      router.push(`/${lang}/awards/${answer.data.public_id}?edit=1`);
    } catch {
      setError(
        tri(
          lang,
          "Confira o nome, o ano e a lista base. Não foi possível criar a premiação.",
          "Check the name, year and source list. The award could not be created.",
          "Revisa el nombre, el año y la lista base. No se pudo crear la premiación.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <button
        className="awards-button"
        data-primary
        type="button"
        onClick={start}
      >
        <Plus size={16} />
        {title}
      </button>
      <Dialog.Portal>
        <Dialog.Overlay className="create-list-overlay" />
        <Dialog.Content className="create-list-dialog awards-create-dialog">
          <header>
            <div>
              <Dialog.Title>
                <Trophy size={20} />
                {title}
              </Dialog.Title>
              <Dialog.Description>
                {tri(
                  lang,
                  "Comece por um modelo e personalize categorias, indicados e vencedores.",
                  "Start with a template and customize categories, nominees and winners.",
                  "Empieza con una plantilla y personaliza categorías, nominados y ganadores.",
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close disabled={pending} aria-label={t.close}>
              <X size={18} />
            </Dialog.Close>
          </header>
          {doc && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <fieldset disabled={pending} className="awards-form-fields">
                <AwardSettings
                  doc={doc}
                  onChange={setDoc}
                  sourceName={sourceName}
                  onSourceName={setSourceName}
                  lang={lang}
                />
                <div className="awards-field">
                  <span>
                    {tri(
                      lang,
                      "Modelo inicial",
                      "Starting template",
                      "Plantilla inicial",
                    )}
                  </span>
                  <AwardSelect
                    label={tri(
                      lang,
                      "Modelo inicial",
                      "Starting template",
                      "Plantilla inicial",
                    )}
                    value={preset}
                    onChange={setPreset}
                    options={[
                      {
                        value: "personal",
                        label: tri(
                          lang,
                          "Pessoal: 6 categorias",
                          "Personal: 6 categories",
                          "Personal: 6 categorías",
                        ),
                      },
                      {
                        value: "tga",
                        label: tri(
                          lang,
                          "Inspirado no TGA: 12 categorias",
                          "Inspired by TGA: 12 categories",
                          "Inspirado en TGA: 12 categorías",
                        ),
                      },
                      {
                        value: "blank",
                        label: tri(
                          lang,
                          "Começar do zero",
                          "Start from scratch",
                          "Empezar desde cero",
                        ),
                      },
                    ]}
                  />
                  <p className="awards-help">
                    {tri(
                      lang,
                      "Todos os nomes e limites podem ser alterados depois.",
                      "All names and limits can be changed later.",
                      "Todos los nombres y límites se pueden cambiar después.",
                    )}
                  </p>
                </div>
              </fieldset>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <button
                  className="awards-button"
                  data-primary
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Plus size={16} />
                  )}{" "}
                  {tri(
                    lang,
                    "Criar rascunho",
                    "Create draft",
                    "Crear borrador",
                  )}
                </button>
              </footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
