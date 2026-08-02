"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  Gamepad2,
  Images,
  ListTree,
  Route,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  XP_RATES,
  levelProgress,
  xpToNextLevel,
  type ProfileLevel,
} from "@/lib/profile-level";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/** Radius of the ring in the SVG's own units, which the CSS then scales. */
const RADIUS = 15;
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
 * Beside the display name, and only on a profile.
 *
 * Deliberately absent from cards, comments and the activity stream: a level is
 * worth a glance when you are reading someone's page and is noise repeated
 * next to every one of their posts.
 */
export function ProfileLevelBadge({
  lang,
  standing,
}: {
  lang: UiLang;
  standing: ProfileLevel;
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
      key: "games",
      Icon: Gamepad2,
      label: tri(lang, "Jogos na biblioteca", "Games in library", "Juegos"),
      count: standing.games,
    },
  ];

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
        <Dialog.Content className="level-dialog">
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
                  <span className="level-source-label">{row.label}</span>
                  <span className="level-source-count">
                    {number.format(row.count)}
                    {" x "}
                    {XP_RATES[row.key]}
                  </span>
                  <span className="level-source-total">
                    {number.format(row.count * XP_RATES[row.key])} XP
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
