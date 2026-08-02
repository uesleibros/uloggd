"use client";

import * as Dialog from "@/components/ui/dialog";
import { motion, useReducedMotion } from "motion/react";
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
  levelProgress,
  points,
  xpToNextLevel,
  type ProfileLevel,
  type XpActivity,
} from "@/lib/profile-level";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { MineralWallet } from "@/components/mineral-wallet";
import { getProfileMinerals, type MineralHolding } from "@/lib/minerals";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/** Radius of the ring in the SVG's own units, which the CSS then scales. */
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * How each activity is presented.
 *
 * The numbers are the database's and arrive with the standing; only the
 * picture and the wording are decided here. That split is the point: this file
 * used to carry its own copy of the rates and explained a scheme the database
 * had already stopped using, twice.
 */
const ACTIVITY_PRESENTATION: Record<
  XpActivity,
  { Icon: LucideIcon; label: (lang: UiLang) => string }
> = {
  REVIEW: {
    Icon: Star,
    label: (lang) => tri(lang, "Avaliações", "Reviews", "Reseñas"),
  },
  JOURNEY: {
    Icon: Route,
    label: (lang) => tri(lang, "Jornadas", "Journeys", "Recorridos"),
  },
  LIST: {
    Icon: ListTree,
    label: (lang) => tri(lang, "Listas", "Lists", "Listas"),
  },
  SESSION: {
    Icon: Gamepad2,
    label: (lang) => tri(lang, "Sessões", "Sessions", "Sesiones"),
  },
  SCREENSHOT: {
    Icon: Images,
    label: (lang) => tri(lang, "Capturas", "Screenshots", "Capturas"),
  },
  COMMENT: {
    Icon: MessageSquare,
    label: (lang) => tri(lang, "Comentários", "Comments", "Comentarios"),
  },
  GAME: {
    Icon: Gamepad2,
    label: (lang) =>
      tri(lang, "Jogos na biblioteca", "Games in library", "Juegos"),
  },
};

/**
 * The level, with a ring around it for progress through the current one.
 *
 * Drawn as one SVG rather than a bordered element with a conic gradient: the
 * gradient version cannot round its own ends, and at this size the difference
 * between a rounded arc and a hard-cut one is most of what makes it read as a
 * progress bar rather than a slice.
 */
function LevelRing({ level, progress }: { level: number; progress: number }) {
  const still = useReducedMotion();
  return (
    <svg className="level-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle className="level-ring-track" cx="18" cy="18" r={RADIUS} />
      <motion.circle
        className="level-ring-fill"
        cx="18"
        cy="18"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        // Drawn from the top rather than from three o'clock, so a nearly empty
        // ring still points where a person expects a progress bar to start.
        transform="rotate(-90 18 18)"
        initial={{ strokeDashoffset: CIRCUMFERENCE }}
        animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
        transition={
          still
            ? { duration: 0 }
            : { duration: MOTION_MS.slow / 1000, ease: EASE_OUT }
        }
      />
      <text className="level-ring-value" x="18" y="18">
        {level}
      </text>
    </svg>
  );
}

/**
 * The level as a plain mark, with no dialog.
 *
 * For the two places a button cannot go and a modal would not work anyway:
 * inside a search result, which is one link acting as a listbox option, and
 * inside the account menu's own trigger. Opening a dialog from either would
 * mean opening it out of a thing that closes on the same click.
 *
 * Everywhere else uses `ProfileLevelBadge`, which is interactive.
 */
export function LevelMark({
  lang,
  standing,
}: {
  lang: UiLang;
  standing: ProfileLevel;
}) {
  const label = tri(
    lang,
    `Nível ${standing.level}`,
    `Level ${standing.level}`,
    `Nivel ${standing.level}`,
  );
  return (
    <span className="level-badge" data-static>
      <LevelRing level={standing.level} progress={levelProgress(standing)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * The level beside a name.
 *
 * The same control in every place it appears, opening the same breakdown: a
 * badge that reacts on a profile and ignores a click in a comment thread is
 * read as broken, not as restrained.
 *
 * It renders a button, so a call site has to place it as a sibling of the name
 * rather than inside the link around it. That is a constraint worth keeping:
 * a button nested in an anchor is invalid, and the two would fight over the
 * same click even where a browser tolerated it.
 *
 * It sits before the verified mark, and takes the same slot, so the two match
 * in a heading, in a comment byline and in a card without any of them saying
 * so.
 */
export function ProfileLevelBadge({
  lang,
  standing,
  profileId,
}: {
  lang: UiLang;
  standing: ProfileLevel;
  /** Whose level this is; the wallet is read when the dialog opens. */
  profileId: string;
}) {
  const [wallet, setWallet] = useState<MineralHolding[]>([]);

  // Read on open, like the verification details. A wallet is six rows and the
  // dialog is opened rarely, so joining it into every feed query to fill a
  // panel nobody looked at would be the wrong trade.
  async function loadWallet() {
    if (wallet.length) return;
    setWallet(await getProfileMinerals(createClient(), profileId));
  }
  const t = uiText(lang);
  const progress = levelProgress(standing);
  const remaining = xpToNextLevel(standing);
  // Up to two decimals: rates are tenths, so a subtotal lands off a whole
  // number and rounding it would hide what an activity earned.
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) void loadWallet();
      }}
    >
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
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: MOTION_MS.slow / 1000, ease: EASE_OUT }}
            />
          </div>
          <p className="level-dialog-scale">
            <span>{number.format(standing.level_floor)}</span>
            <span>{number.format(standing.next_level_at)} XP</span>
          </p>

          {/* Straight from `profile_level`, in the order it scored them. The
              rates are not repeated here, so the dialog cannot go on
              describing a scheme the database has stopped using. */}
          <ul className="level-dialog-sources">
            {standing.sources.map((source) => {
              const { Icon, label } = ACTIVITY_PRESENTATION[source.activity];
              const capped = source.count > source.scored;
              return (
                <li
                  key={source.activity}
                  data-empty={source.scored === 0 || undefined}
                >
                  <Icon size={14} aria-hidden />
                  <span className="level-source-label">
                    {label(lang)}
                    {capped ? (
                      <span className="level-source-note">
                        {tri(
                          lang,
                          `de ${number.format(source.count)}, no limite`,
                          `of ${number.format(source.count)}, capped`,
                          `de ${number.format(source.count)}, al límite`,
                        )}
                      </span>
                    ) : null}
                  </span>
                  <span className="level-source-count">
                    {number.format(source.scored)}
                    {" x "}
                    {number.format(points(source.tenths))}
                  </span>
                  <span className="level-source-total">
                    {number.format(points(source.earned_tenths))} XP
                  </span>
                </li>
              );
            })}
          </ul>

          <MineralWallet holdings={wallet} lang={lang} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
