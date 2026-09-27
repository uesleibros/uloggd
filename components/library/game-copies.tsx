"use client";

import * as Dialog from "@/components/ui/dialog";
import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  Disc3,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api, settle } from "@/lib/api-client";
import {
  copyDetail,
  copyLabel,
  mediumLabel,
  ownershipLabel,
  storefrontLabel,
  type Copy,
} from "@/lib/library-copies";
import { COPIES_CHANGED_EVENT, announceCopies } from "@/lib/copies-event";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { useEffect } from "react";

const STOREFRONTS = [
  "STEAM",
  "PLAYSTATION",
  "NINTENDO",
  "XBOX",
  "GOG",
  "EPIC",
  "ITCH",
  "NUUVEM",
  "BATTLE_NET",
  "UBISOFT",
  "EA",
  "AMAZON",
  "HUMBLE",
  "GOOGLE_PLAY",
  "APP_STORE",
  "RETAIL",
  "OTHER",
];
const OWNERSHIPS = [
  "OWNED",
  "SUBSCRIPTION",
  "BORROWED",
  "RENTED",
  "SHARED",
  "PREVIOUSLY_OWNED",
];
const MEDIUMS = ["PHYSICAL", "DIGITAL"];

/** The select shape this file needs, written once. */
function Picker({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const chosen = options.find((option) => option.value === value);
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="editor-select-trigger">
        <Select.Value>{chosen?.label ?? placeholder}</Select.Value>
        <Select.Icon>
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="editor-select-option"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

type Draft = {
  id: string | null;
  platform: string;
  medium: string;
  storefront: string;
  ownership: string;
  edition: string;
  region: string;
  acquired: string;
  note: string;
};

const EMPTY: Draft = {
  id: null,
  platform: "",
  medium: "",
  storefront: "",
  ownership: "",
  edition: "",
  region: "",
  acquired: "",
  note: "",
};

/**
 * The copies somebody has of this game.
 *
 * In the rail beside the status and the rating, because it answers the same
 * kind of question: where does this game stand with me. One line while there
 * is nothing to say, a row of copies once there is, and everything past the
 * platform behind "more details" for the people who want it.
 *
 * "I played it on PS5" is a copy with a platform and nothing else, and that
 * has to stay the fast answer: a person who never opens the rest should not
 * be able to tell it is there.
 */
export function GameCopies({
  game,
  platforms,
  initial,
  lang,
  enabled,
}: {
  game: { id: number; slug: string };
  platforms: { id: number; name: string }[];
  initial: Copy[];
  lang: UiLang;
  enabled: boolean;
}) {
  const t = uiText(lang);
  const [copies, setCopies] = useState(initial);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A run editor can make a copy too, and the two live on different pages of
  // the same tree. They meet over the same event the rest of the site uses.
  useEffect(() => {
    function heard(event: Event) {
      const detail = (event as CustomEvent<{ gameId: number; copies: Copy[] }>)
        .detail;
      if (detail.gameId === game.id) setCopies(detail.copies);
    }
    window.addEventListener(COPIES_CHANGED_EVENT, heard);
    return () => window.removeEventListener(COPIES_CHANGED_EVENT, heard);
  }, [game.id]);

  if (!enabled) return null;

  function edit(copy: Copy) {
    setDraft({
      id: copy.id,
      platform: copy.platform_id ? String(copy.platform_id) : "",
      medium: copy.medium ?? "",
      storefront: copy.storefront ?? "",
      ownership: copy.ownership ?? "",
      edition: copy.edition ?? "",
      region: copy.region ?? "",
      acquired: copy.acquired_on ?? "",
      note: copy.note ?? "",
    });
    setMore(
      Boolean(
        copy.medium ||
        copy.storefront ||
        copy.ownership ||
        copy.edition ||
        copy.region ||
        copy.acquired_on ||
        copy.note,
      ),
    );
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (pending) return;
    setPending(true);
    setError(null);
    const named = platforms.find((one) => String(one.id) === draft.platform);
    // Editing sends every field, with null for the empty ones, because a
    // field left out of a PATCH stays as it was and somebody emptying a box
    // means to empty it. Creating sends only what was filled in, so the
    // collection can find a copy that already matches.
    const said = <T,>(value: T | "" | null) =>
      value === "" || value === null ? (draft.id ? null : undefined) : value;
    const body = {
      igdb_id: game.id,
      game_slug: game.slug,
      platform_id: said(draft.platform ? Number(draft.platform) : ""),
      platform_name: said(draft.platform ? (named?.name ?? "") : ""),
      medium: said(draft.medium),
      storefront: said(draft.storefront),
      ownership: said(draft.ownership),
      edition: said(draft.edition.trim()),
      region: said(draft.region.trim()),
      acquired_on: said(draft.acquired),
      note: said(draft.note.trim()),
    };
    // A copy that exists is changed where it lives, and a new one is asked
    // for from the collection, which answers with the one that already
    // matches rather than making a second identical row.
    const { data, error: failure } = await settle(
      draft.id
        ? api.patch<{ data: Copy }>(`/library/copies/${draft.id}`, body)
        : api.post<{ data: Copy; created: boolean }>("/library/copies", body),
    );
    setPending(false);
    if (failure || !data) {
      setError(
        tri(
          lang,
          "Não deu para salvar a cópia.",
          "The copy could not be saved.",
          "No se pudo guardar la copia.",
        ),
      );
      return;
    }
    const next = copies.some((one) => one.id === data.id)
      ? copies.map((one) => (one.id === data.id ? data : one))
      : [...copies, data];
    setCopies(next);
    announceCopies(game.id, next);
    setOpen(false);
    setDraft(EMPTY);
  }

  async function remove(id: string) {
    if (removing) return;
    setRemoving(id);
    const { error: failure } = await settle(
      api.delete<{ data: unknown }>(`/library/copies/${id}`),
    );
    setRemoving(null);
    if (failure) {
      setError(
        tri(
          lang,
          "Não deu para remover a cópia.",
          "The copy could not be removed.",
          "No se pudo eliminar la copia.",
        ),
      );
      return;
    }
    const next = copies.filter((one) => one.id !== id);
    setCopies(next);
    announceCopies(game.id, next);
  }

  return (
    <section className="game-copies">
      <header>
        <span>
          <Disc3 size={13} aria-hidden />
          {tri(lang, "SUAS CÓPIAS", "YOUR COPIES", "TUS COPIAS")}
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY);
            setMore(false);
            setError(null);
            setOpen(true);
          }}
          aria-label={tri(
            lang,
            "Adicionar cópia",
            "Add a copy",
            "Añadir copia",
          )}
        >
          <Plus size={14} />
        </button>
      </header>
      {copies.length === 0 ? (
        <p>
          {tri(
            lang,
            "Registre onde você tem este jogo.",
            "Record where you have this game.",
            "Registra dónde tienes este juego.",
          )}
        </p>
      ) : (
        <ul>
          {copies.map((copy) => {
            const detail = copyDetail(copy, lang);
            return (
              <li key={copy.id}>
                <div>
                  <strong>{copyLabel(copy, lang)}</strong>
                  {detail && <small>{detail}</small>}
                </div>
                <button
                  type="button"
                  onClick={() => edit(copy)}
                  aria-label={t.edit}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(copy.id)}
                  disabled={removing === copy.id}
                  aria-label={t.delete}
                >
                  {removing === copy.id ? (
                    <LoaderCircle size={13} className="spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="game-copies-error">{error}</p>}

      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog game-copy-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <Dialog.Title>
                  {draft.id
                    ? tri(lang, "Editar cópia", "Edit copy", "Editar copia")
                    : tri(lang, "Nova cópia", "New copy", "Nueva copia")}
                </Dialog.Title>
                <span>
                  {tri(
                    lang,
                    "Só a plataforma já basta.",
                    "The platform alone is enough.",
                    "Solo la plataforma ya basta.",
                  )}
                </span>
              </div>
              <Dialog.Close aria-label={t.close} disabled={pending}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <div className="social-editor-form">
              <label>
                <span>{tri(lang, "Plataforma", "Platform", "Plataforma")}</span>
                <Picker
                  value={draft.platform}
                  onChange={(next) =>
                    setDraft((was) => ({ ...was, platform: next }))
                  }
                  placeholder={tri(lang, "Sem definir", "Unset", "Sin definir")}
                  options={platforms.map((one) => ({
                    value: String(one.id),
                    label: one.name,
                  }))}
                />
              </label>
              {!more && (
                <button
                  type="button"
                  className="game-copy-more"
                  onClick={() => setMore(true)}
                >
                  <Plus size={13} />
                  {tri(
                    lang,
                    "Detalhes da cópia",
                    "Copy details",
                    "Detalles de la copia",
                  )}
                </button>
              )}
              {more && (
                <>
                  <div className="game-copy-pair">
                    <label>
                      <span>{tri(lang, "Mídia", "Medium", "Medio")}</span>
                      <Picker
                        value={draft.medium}
                        onChange={(next) =>
                          setDraft((was) => ({ ...was, medium: next }))
                        }
                        placeholder={tri(
                          lang,
                          "Sem definir",
                          "Unset",
                          "Sin definir",
                        )}
                        options={MEDIUMS.map((one) => ({
                          value: one,
                          label: mediumLabel(one, lang),
                        }))}
                      />
                    </label>
                    <label>
                      <span>{tri(lang, "Loja", "Storefront", "Tienda")}</span>
                      <Picker
                        value={draft.storefront}
                        onChange={(next) =>
                          setDraft((was) => ({ ...was, storefront: next }))
                        }
                        placeholder={tri(
                          lang,
                          "Sem definir",
                          "Unset",
                          "Sin definir",
                        )}
                        options={STOREFRONTS.map((one) => ({
                          value: one,
                          label: storefrontLabel(one, lang),
                        }))}
                      />
                    </label>
                  </div>
                  <div className="game-copy-pair">
                    <label>
                      <span>{tri(lang, "Posse", "Ownership", "Posesión")}</span>
                      <Picker
                        value={draft.ownership}
                        onChange={(next) =>
                          setDraft((was) => ({ ...was, ownership: next }))
                        }
                        placeholder={tri(
                          lang,
                          "Sem definir",
                          "Unset",
                          "Sin definir",
                        )}
                        options={OWNERSHIPS.map((one) => ({
                          value: one,
                          label: ownershipLabel(one, lang),
                        }))}
                      />
                    </label>
                    <label>
                      <span>{tri(lang, "Edição", "Edition", "Edición")}</span>
                      <input
                        value={draft.edition}
                        maxLength={120}
                        onChange={(change) =>
                          setDraft((was) => ({
                            ...was,
                            edition: change.target.value,
                          }))
                        }
                        placeholder={tri(
                          lang,
                          "Deluxe, Collector's",
                          "Deluxe, Collector's",
                          "Deluxe, Collector's",
                        )}
                      />
                    </label>
                  </div>
                  <div className="game-copy-pair">
                    <label>
                      <span>{tri(lang, "Região", "Region", "Región")}</span>
                      <input
                        value={draft.region}
                        maxLength={60}
                        onChange={(change) =>
                          setDraft((was) => ({
                            ...was,
                            region: change.target.value,
                          }))
                        }
                        placeholder="NTSC-U, PAL"
                      />
                    </label>
                    <label>
                      <span>
                        {tri(lang, "Adquirida em", "Acquired", "Adquirida en")}
                      </span>
                      <input
                        type="date"
                        value={draft.acquired}
                        onChange={(change) =>
                          setDraft((was) => ({
                            ...was,
                            acquired: change.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label>
                    <span>{tri(lang, "Observação", "Note", "Nota")}</span>
                    <input
                      value={draft.note}
                      maxLength={300}
                      onChange={(change) =>
                        setDraft((was) => ({
                          ...was,
                          note: change.target.value,
                        }))
                      }
                      placeholder={tri(
                        lang,
                        "O caso incomum que a lista não cobre.",
                        "The unusual case the list does not cover.",
                        "El caso raro que la lista no cubre.",
                      )}
                    />
                  </label>
                </>
              )}
              {error && <p className="play-bar-error">{error}</p>}
              <div className="play-close-actions">
                <Dialog.Close type="button" disabled={pending}>
                  {t.cancel}
                </Dialog.Close>
                <button
                  type="button"
                  className="play-close-confirm"
                  onClick={() => void save()}
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle size={14} className="spin" aria-hidden />
                  ) : (
                    <Check size={14} aria-hidden />
                  )}
                  {t.save}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
