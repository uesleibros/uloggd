"use client";

import * as Dialog from "@/components/ui/dialog";
import * as Select from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check,
  ChevronDown,
  Disc3,
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
import { useState } from "react";
import { api, settle } from "@/lib/api-client";
import type { JourneyOverview, LibraryCopy } from "@/lib/content-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Status = "PLANNED" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

const STATUSES: Status[] = [
  "PLANNED",
  "PLAYING",
  "ON_HOLD",
  "COMPLETED",
  "DROPPED",
];

function statusLabel(status: Status, lang: UiLang) {
  const names: Record<Status, [string, string, string]> = {
    PLANNED: ["Planejada", "Planned", "Planeada"],
    PLAYING: ["Em andamento", "In progress", "En curso"],
    ON_HOLD: ["Pausada", "Shelved", "Pausada"],
    COMPLETED: ["Concluída", "Completed", "Completada"],
    DROPPED: ["Abandonada", "Dropped", "Abandonada"],
  };
  return tri(lang, ...names[status]);
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
  copies: LibraryCopy[];
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
  const [platform, setPlatform] = useState(
    overview?.copy_platform_id ? String(overview.copy_platform_id) : "",
  );

  const facts: { icon: typeof Flag; text: string }[] = [];
  if (overview?.status)
    facts.push({ icon: Flag, text: statusLabel(overview.status, lang) });
  if (overview?.copy_platform_name)
    facts.push({ icon: Monitor, text: overview.copy_platform_name });
  if (overview?.copy_edition)
    facts.push({ icon: Disc3, text: overview.copy_edition });
  if (overview?.difficulty)
    facts.push({ icon: Gauge, text: overview.difficulty });
  if (overview?.progress) facts.push({ icon: MapPin, text: overview.progress });
  if (overview?.replay)
    facts.push({
      icon: Repeat,
      text: tri(lang, "Rejogada", "Replay", "Repetición"),
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

    // The copy first, because the run points at one: a platform picked here
    // is a copy of this game with the platform filled in and nothing else,
    // which is the smallest true thing somebody can say about how they played.
    let copyId = overview?.copy_id ?? null;
    if (platform) {
      const existing = copies.find(
        (copy) => String(copy.platform_id ?? "") === platform,
      );
      if (existing) copyId = existing.id;
      else {
        const named = platforms.find((one) => String(one.id) === platform);
        const { data, error: failure } = await settle(
          api.post<{ data: LibraryCopy }>("/library/copies", {
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
      }
    }

    const { error: failure } = await settle(
      api.patch<{ data: unknown }>(`/journal/journeys/${journeyId}`, {
        ...(status ? { status } : {}),
        ...(startedOn ? { started_on: startedOn } : {}),
        ...(finishedOn ? { finished_on: finishedOn } : {}),
        ...(copyId ? { library_entry_id: copyId } : {}),
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
                  {platforms.length > 0 && (
                    <label>
                      <span>
                        {tri(lang, "Plataforma", "Platform", "Plataforma")}
                      </span>
                      <Picker
                        value={platform}
                        onChange={setPlatform}
                        placeholder={tri(
                          lang,
                          "Sem definir",
                          "Unset",
                          "Sin definir",
                        )}
                        options={platforms.map((one) => ({
                          value: String(one.id),
                          label: one.name,
                        }))}
                      />
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
        </>
      )}
    </div>
  );
}
