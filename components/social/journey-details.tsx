"use client";

import * as Dialog from "@/components/ui/dialog";
import * as Select from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check,
  ChevronDown,
  Flag,
  Gauge,
  LoaderCircle,
  MapPin,
  Monitor,
  Pencil,
  Repeat,
  Star,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, settle } from "@/lib/api-client";
import type { JourneyOverview } from "@/lib/content-types";
import {
  copyLabel,
  mediumLabel,
  ownershipLabel,
  storefrontLabel,
  type Copy,
} from "@/lib/library-copies";
import { COPIES_CHANGED_EVENT, announceCopies } from "@/lib/copies-event";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { journeyStatusLabel } from "@/lib/game-status";

type Status = "PLANNED" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

const STATUSES: Status[] = [
  "PLANNED",
  "PLAYING",
  "ON_HOLD",
  "COMPLETED",
  "DROPPED",
];

/** The run's own vocabulary, which lives beside the library's. */
function statusLabel(status: Status, lang: UiLang) {
  return journeyStatusLabel(status, lang);
}

/** The one select shape this file needs, so it is written once. */
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

/**
 * What kind of run this was, beside the sessions that make it up.
 *
 * A journey has always been a name over a list of sessions. These are the
 * facts that make it a playthrough: where it got to, what it was played on,
 * whether it was a replay, and the review that came out of it. Every one of
 * them is optional, and a run with none of them filled in is the ordinary
 * case rather than an unfinished form.
 */
export function JourneyDetails({
  journeyId,
  overview,
  copies,
  platforms,
  game,
  isOwner,
  lang,
}: {
  journeyId: string;
  overview: JourneyOverview | null;
  copies: Copy[];
  platforms: { id: number; name: string }[];
  game: { id: number; slug: string };
  isOwner: boolean;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | "">(overview?.status ?? "");
  const [difficulty, setDifficulty] = useState(overview?.difficulty ?? "");
  const [progress, setProgress] = useState(overview?.progress ?? "");
  const [replay, setReplay] = useState(Boolean(overview?.replay));
  const [mastered, setMastered] = useState(Boolean(overview?.mastered));
  const [startedOn, setStartedOn] = useState(overview?.started_on ?? "");
  const [finishedOn, setFinishedOn] = useState(overview?.finished_on ?? "");
  const [known, setKnown] = useState(copies);
  // "" is unspecified, NEW is "add one", anything else is a copy's id. A run
  // with no copy is the honest state of most runs and stays reachable.
  const [chosen, setChosen] = useState(overview?.copy_id ?? "");
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    function heard(event: Event) {
      const detail = (event as CustomEvent<{ gameId: number; copies: Copy[] }>)
        .detail;
      if (detail.gameId === game.id) setKnown(detail.copies);
    }
    window.addEventListener(COPIES_CHANGED_EVENT, heard);
    return () => window.removeEventListener(COPIES_CHANGED_EVENT, heard);
  }, [game.id]);

  const facts: { icon: typeof Flag; text: string }[] = [];
  if (overview?.status)
    facts.push({ icon: Flag, text: statusLabel(overview.status, lang) });
  // One chip for the copy, not one per field of it: "PS5 · Digital ·
  // PlayStation Store" is a thing, and three chips beside each other are a
  // form somebody filled in.
  if (overview?.copy_id)
    facts.push({
      icon: Monitor,
      text: copyLabel(
        {
          id: overview.copy_id,
          igdb_id: game.id,
          game_slug: game.slug,
          platform_id: overview.copy_platform_id,
          platform_name: overview.copy_platform_name,
          storefront: overview.copy_storefront,
          ownership: overview.copy_ownership,
          medium: overview.copy_medium,
          edition: overview.copy_edition,
          region: null,
          note: null,
          acquired_on: null,
        },
        lang,
      ),
    });
  if (overview?.difficulty)
    facts.push({ icon: Gauge, text: overview.difficulty });
  if (overview?.progress) facts.push({ icon: MapPin, text: overview.progress });
  if (overview?.replay)
    facts.push({
      icon: Repeat,
      text: t.replay,
    });
  if (overview?.mastered)
    facts.push({
      icon: Trophy,
      text: tri(lang, "Platinada", "Mastered", "Platinada"),
    });

  async function save() {
    if (pending) return;
    setPending(true);
    setError(null);

    // The copy first, because the run points at one. Picking a platform for
    // a run it does not have a copy for makes one with the platform filled in
    // and nothing else, which is the smallest true thing somebody can say
    // about how they played. The API answers with the copy that already
    // matches rather than making a second identical row.
    let copyId: string | null =
      chosen && chosen !== "NEW" ? chosen : (overview?.copy_id ?? null);
    const clearCopy = chosen === "" && Boolean(overview?.copy_id);
    if (clearCopy) copyId = null;

    if (chosen === "NEW" && platform) {
      const named = platforms.find((one) => String(one.id) === platform);
      const { data, error: failure } = await settle(
        api.post<{ data: Copy }>("/library/copies", {
          igdb_id: game.id,
          game_slug: game.slug,
          platform_id: Number(platform),
          platform_name: named?.name ?? null,
        }),
      );
      if (failure || !data) {
        setPending(false);
        setError(
          tri(
            lang,
            "Não deu para salvar a plataforma.",
            "The platform could not be saved.",
            "No se pudo guardar la plataforma.",
          ),
        );
        return;
      }
      copyId = data.id;
      const next = known.some((one) => one.id === data.id)
        ? known.map((one) => (one.id === data.id ? data : one))
        : [...known, data];
      setKnown(next);
      announceCopies(game.id, next);
    }

    const { error: failure } = await settle(
      api.patch<{ data: unknown }>(`/journal/journeys/${journeyId}`, {
        ...(status ? { status } : {}),
        ...(startedOn ? { started_on: startedOn } : {}),
        ...(finishedOn ? { finished_on: finishedOn } : {}),
        ...(copyId ? { library_entry_id: copyId } : {}),
        ...(clearCopy ? { clear_copy: true } : {}),
        ...(difficulty.trim() ? { difficulty: difficulty.trim() } : {}),
        ...(progress.trim() ? { progress: progress.trim() } : {}),
        replay,
        mastered,
      }),
    );
    setPending(false);
    if (failure) {
      setError(
        tri(
          lang,
          "Não deu para salvar agora.",
          "That could not be saved right now.",
          "No se pudo guardar ahora.",
        ),
      );
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!facts.length && !overview?.review_public_id && !isOwner) return null;

  return (
    <div className="journey-facts">
      {facts.map(({ icon: Icon, text }) => (
        <span key={text} className="journey-fact">
          <Icon size={12} aria-hidden />
          {text}
        </span>
      ))}
      {overview?.review_public_id && (
        <Link
          className="journey-fact journey-fact-review"
          href={`/${lang}/review/${overview.review_public_id}`}
        >
          <Star size={12} aria-hidden />
          {tri(lang, "Avaliação", "Review", "Reseña")}
        </Link>
      )}
      {isOwner && (
        <>
          <button
            type="button"
            className="journey-fact journey-fact-edit"
            onClick={() => setOpen(true)}
          >
            <Pencil size={12} aria-hidden />
            {facts.length
              ? t.edit
              : tri(
                  lang,
                  "Detalhar a jornada",
                  "Describe the run",
                  "Detallar el recorrido",
                )}
          </button>
          <Dialog.Root
            open={open}
            onOpenChange={(next) => {
              if (!pending) setOpen(next);
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="drawer-backdrop" />
              <Dialog.Content
                className="social-editor-dialog journey-details-dialog"
                aria-describedby={undefined}
              >
                <header>
                  <div>
                    <Dialog.Title>
                      {tri(
                        lang,
                        "Sobre esta jornada",
                        "About this run",
                        "Sobre este recorrido",
                      )}
                    </Dialog.Title>
                    <span>
                      {tri(
                        lang,
                        "Tudo aqui é opcional.",
                        "Everything here is optional.",
                        "Todo aquí es opcional.",
                      )}
                    </span>
                  </div>
                  <Dialog.Close aria-label={t.close} disabled={pending}>
                    <X size={18} />
                  </Dialog.Close>
                </header>
                <div className="social-editor-form">
                  <label>
                    <span>{tri(lang, "Situação", "State", "Situación")}</span>
                    <Picker
                      value={status}
                      onChange={(next) => setStatus(next as Status)}
                      placeholder={tri(
                        lang,
                        "Sem definir",
                        "Unset",
                        "Sin definir",
                      )}
                      options={STATUSES.map((one) => ({
                        value: one,
                        label: statusLabel(one, lang),
                      }))}
                    />
                  </label>
                  <label>
                    <span>{tri(lang, "Cópia", "Copy", "Copia")}</span>
                    <Picker
                      value={chosen}
                      onChange={setChosen}
                      placeholder={tri(
                        lang,
                        "Não especificada",
                        "Unspecified",
                        "Sin especificar",
                      )}
                      options={[
                        {
                          value: "",
                          label: tri(
                            lang,
                            "Não especificada",
                            "Unspecified",
                            "Sin especificar",
                          ),
                        },
                        ...known.map((copy) => ({
                          value: copy.id,
                          label: copyLabel(copy, lang),
                        })),
                        ...(platforms.length
                          ? [
                              {
                                value: "NEW",
                                label: tri(
                                  lang,
                                  "Adicionar nova cópia",
                                  "Add a new copy",
                                  "Añadir nueva copia",
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                    {chosen && chosen !== "NEW" && (
                      <small>
                        {(() => {
                          const copy = known.find((one) => one.id === chosen);
                          if (!copy) return null;
                          return [
                            copy.medium ? mediumLabel(copy.medium, lang) : null,
                            copy.storefront
                              ? storefrontLabel(copy.storefront, lang)
                              : null,
                            copy.ownership
                              ? ownershipLabel(copy.ownership, lang)
                              : null,
                            copy.region,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                        })()}
                      </small>
                    )}
                  </label>
                  {chosen === "NEW" && platforms.length > 0 && (
                    <label>
                      <span>
                        {t.platform}
                      </span>
                      <Picker
                        value={platform}
                        onChange={setPlatform}
                        placeholder={tri(
                          lang,
                          "Escolha uma",
                          "Pick one",
                          "Elige una",
                        )}
                        options={platforms.map((one) => ({
                          value: String(one.id),
                          label: one.name,
                        }))}
                      />
                      {/* The rest of what a copy can say lives with the
                          copies, on the game's page, so this dialog never
                          becomes a second place to edit them. */}
                      <small>
                        {tri(
                          lang,
                          "Mídia, loja e edição ficam em Suas cópias, na página do jogo.",
                          "Medium, storefront and edition live in Your copies, on the game's page.",
                          "Medio, tienda y edición están en Tus copias, en la página del juego.",
                        )}
                      </small>
                    </label>
                  )}
                  <div className="journey-details-dates">
                    <label>
                      <span>{tri(lang, "Começou", "Started", "Empezó")}</span>
                      <input
                        type="date"
                        value={startedOn}
                        onChange={(change) => setStartedOn(change.target.value)}
                      />
                    </label>
                    <label>
                      <span>
                        {tri(lang, "Terminou", "Finished", "Terminó")}
                      </span>
                      <input
                        type="date"
                        value={finishedOn}
                        onChange={(change) =>
                          setFinishedOn(change.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    <span>
                      {tri(lang, "Dificuldade", "Difficulty", "Dificultad")}
                    </span>
                    <input
                      value={difficulty}
                      maxLength={80}
                      onChange={(change) => setDifficulty(change.target.value)}
                      placeholder={tri(
                        lang,
                        "Difícil, Nightmare, Nível 3",
                        "Hard, Nightmare, Level 3",
                        "Difícil, Nightmare, Nivel 3",
                      )}
                    />
                  </label>
                  <label>
                    <span>
                      {tri(lang, "Onde cheguei", "Progress", "Progreso")}
                    </span>
                    <input
                      value={progress}
                      maxLength={160}
                      onChange={(change) => setProgress(change.target.value)}
                      placeholder={tri(
                        lang,
                        "Créditos, capítulo 7, 80%",
                        "Credits, chapter 7, 80%",
                        "Créditos, capítulo 7, 80%",
                      )}
                    />
                  </label>
                  <label className="journey-details-check">
                    <Checkbox
                      checked={replay}
                      onCheckedChange={(next) => setReplay(Boolean(next))}
                    />
                    <span>
                      <Repeat size={13} aria-hidden />
                      {tri(
                        lang,
                        "Já tinha jogado antes",
                        "I had played it before",
                        "Ya lo había jugado antes",
                      )}
                    </span>
                  </label>
                  <label className="journey-details-check">
                    <Checkbox
                      checked={mastered}
                      onCheckedChange={(next) => setMastered(Boolean(next))}
                    />
                    <span>
                      <Trophy size={13} aria-hidden />
                      {tri(
                        lang,
                        "Platinei nesta jornada",
                        "I mastered it in this run",
                        "La platiné en este recorrido",
                      )}
                    </span>
                  </label>
                  {error && <p className="play-bar-error">{error}</p>}
                  <footer className="play-close-actions">
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
                  </footer>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )}
    </div>
  );
}
