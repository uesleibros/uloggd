"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  Gamepad2,
  Images,
  ListTree,
  MessageSquare,
  Route,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  XP_RATES,
  levelProgress,
  xpFor,
  xpToNextLevel,
  type ProfileLevel,
} from "@/lib/profile-level";
import { Tooltip } from "@/components/ui/tooltip";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/** Radius of the ring in the SVG's own units, which the CSS then scales. */
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The level, with a ring around it for progress through the current one.
 *
 * Drawn as one SVG rather than a bordered element with a conic gradient: the
 * gradient version cannot round its own ends, and at this size the difference
 * between a rounded arc and a hard-cut one is most of what makes it read as a
 * progress bar rather than a slice.
 */
function LevelRing({ level, progress }: { level: number; progress: number }) {
  return (
    <svg className="level-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle className="level-ring-track" cx="18" cy="18" r={RADIUS} />
      <circle
        className="level-ring-fill"
        cx="18"
        cy="18"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        // Drawn from the top rather than from three o'clock, so a nearly empty
        // ring still points somewhere a person expects a progress bar to start.
        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        transform="rotate(-90 18 18)"
      />
      <text className="level-ring-value" x="18" y="18">
        {level}
      </text>
    </svg>
  );
}

/**
 * The level beside a name.
 *
 * Appears everywhere the verified mark does, and takes its size from the same
 * slot, so a heading, a comment byline and a card all get a badge that matches
 * the check mark beside it without any of them saying so.
 *
 * It sits before the mark: the level is the account describing itself and the
 * mark is moderation vouching for it, so the claim reads before the
 * confirmation of it.
 */
export function ProfileLevelBadge({
  lang,
  standing,
  interactive = true,
}: {
  lang: UiLang;
  standing: ProfileLevel;
  /**
   * A button opening the breakdown, or a plain mark with a tooltip.
   *
   * Off everywhere the badge lands inside a link or a menu trigger, which is
   * most places it appears: a button nested in an anchor is invalid, and the
   * two controls fight over the same click. The profile header is the one spot
   * where it stands on its own, so that is where the dialog lives.
   */
  interactive?: boolean;
}) {
  const t = uiText(lang);
  const progress = levelProgress(standing);
  const remaining = xpToNextLevel(standing);
  const number = new Intl.NumberFormat(lang);

  const rows: {
    key: keyof typeof XP_RATES;
    label: string;
    count: number;
    Icon: LucideIcon;
    note?: string;
  }[] = [
    {
      key: "sessions",
      Icon: Gamepad2,
      label: tri(lang, "Sessões", "Sessions", "Sesiones"),
      count: standing.sessions,
    },
    {
      key: "reviews",
      Icon: Star,
      label: tri(lang, "Avaliações", "Reviews", "Reseñas"),
      count: standing.reviews,
    },
    {
      key: "journeys",
      Icon: Route,
      label: tri(lang, "Jornadas", "Journeys", "Recorridos"),
      count: standing.journeys,
    },
    {
      key: "lists",
      Icon: ListTree,
      label: tri(lang, "Listas", "Lists", "Listas"),
      count: standing.lists,
    },
    {
      key: "screenshots",
      Icon: Images,
      label: tri(lang, "Capturas", "Screenshots", "Capturas"),
      count: standing.screenshots,
    },
    {
      key: "comments",
      Icon: MessageSquare,
      label: tri(lang, "Comentários", "Comments", "Comentarios"),
      count: standing.comments,
    },
    {
      key: "games",
      Icon: Gamepad2,
      label: tri(lang, "Jogos na biblioteca", "Games in library", "Juegos"),
      // The scored count, not the owned one. A library earns up to a hundred
      // games' worth and no more, so importing a thousand cannot buy a level
      // that writing has to be earned for. Shown as a capped figure rather
      // than silently scoring one number and displaying another.
      count: standing.games_scored,
      note:
        standing.games > standing.games_scored
          ? tri(
              lang,
              `de ${number.format(standing.games)}, no limite`,
              `of ${number.format(standing.games)}, capped`,
              `de ${number.format(standing.games)}, al límite`,
            )
          : undefined,
    },
  ];

  const remainingLabel =
    remaining > 0
      ? tri(
          lang,
          `Nível ${standing.level} · faltam ${number.format(remaining)} XP`,
          `Level ${standing.level} · ${number.format(remaining)} XP to go`,
          `Nivel ${standing.level} · faltan ${number.format(remaining)} XP`,
        )
      : tri(
          lang,
          `Nível ${standing.level}`,
          `Level ${standing.level}`,
          `Nivel ${standing.level}`,
        );

  if (!interactive)
    return (
      <Tooltip label={remainingLabel}>
        <span className="level-badge" data-static>
          <LevelRing level={standing.level} progress={progress} />
          <span className="sr-only">{remainingLabel}</span>
        </span>
      </Tooltip>
    );

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="level-badge"
          type="button"
          aria-label={tri(
            lang,
            `Nível ${standing.level}. Ver detalhes de XP`,
            `Level ${standing.level}. See XP details`,
            `Nivel ${standing.level}. Ver detalles de XP`,
          )}
        >
          <LevelRing level={standing.level} progress={progress} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="verified-dialog-overlay" />
        <Dialog.Content className="verified-dialog level-dialog">
          <Dialog.Close className="verified-dialog-close" aria-label={t.close}>
            <X size={18} />
          </Dialog.Close>

          <div className="level-dialog-ring" aria-hidden="true">
            <LevelRing level={standing.level} progress={progress} />
          </div>
          <Dialog.Title>
            {tri(
              lang,
              `Nível ${standing.level}`,
              `Level ${standing.level}`,
              `Nivel ${standing.level}`,
            )}
          </Dialog.Title>
          <Dialog.Description>
            {remaining > 0
              ? tri(
                  lang,
                  `${number.format(standing.xp)} XP no total, faltam ${number.format(remaining)} para o nível ${standing.level + 1}.`,
                  `${number.format(standing.xp)} XP in total, ${number.format(remaining)} to go until level ${standing.level + 1}.`,
                  `${number.format(standing.xp)} XP en total, faltan ${number.format(remaining)} para el nivel ${standing.level + 1}.`,
                )
              : tri(
                  lang,
                  `${number.format(standing.xp)} XP no total.`,
                  `${number.format(standing.xp)} XP in total.`,
                  `${number.format(standing.xp)} XP en total.`,
                )}
          </Dialog.Description>

          <div
            className="level-dialog-bar"
            role="progressbar"
            aria-valuemin={standing.level_floor}
            aria-valuemax={standing.next_level_at}
            aria-valuenow={standing.xp}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="level-dialog-scale">
            <span>{number.format(standing.level_floor)}</span>
            <span>{number.format(standing.next_level_at)} XP</span>
          </p>

          <ul className="level-dialog-sources">
            {rows.map(({ Icon, ...row }) => {
              return (
                <li key={row.key} data-empty={row.count === 0 || undefined}>
                  <Icon size={14} aria-hidden />
                  <span className="level-source-label">
                    {row.label}
                    {row.note ? (
                      <span className="level-source-note">{row.note}</span>
                    ) : null}
                  </span>
                  <span className="level-source-count">
                    {number.format(row.count)}
                    {" x "}
                    {XP_RATES[row.key].xp / XP_RATES[row.key].per}
                  </span>
                  <span className="level-source-total">
                    {number.format(xpFor(row.key, row.count))} XP
                  </span>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
