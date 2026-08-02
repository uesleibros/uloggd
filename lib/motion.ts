import type { Transition } from "motion/react";

/**
 * The motion vocabulary, in one place.
 *
 * Durations and easings were written inline wherever something animated, which
 * is how a codebase ends up with 120ms, 140ms, 150ms and 160ms all meaning
 * "quick" and drifting apart. These are the same three curves the stylesheets
 * already use, so a component animated with Motion and one animated with a CSS
 * transition move the same way.
 */

/** `cubic-bezier(0.23, 1, 0.32, 1)`, the ease used across the stylesheets. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** For things leaving, where a slow tail reads as lag rather than as polish. */
export const EASE_IN = [0.4, 0, 1, 1] as const;

/**
 * Durations in milliseconds.
 *
 * Named for what they are for rather than for their length, so choosing one is
 * a question about the interaction. Motion takes seconds, hence the division
 * at each use; the numbers stay in milliseconds to match the CSS.
 */
export const MOTION_MS = {
  /** Hover and press feedback, which must not lag behind the pointer. */
  instant: 120,
  /** Something appearing or disappearing in place. */
  quick: 180,
  /** A panel, sheet or dialog arriving. */
  normal: 240,
  /** A value counting up: a progress ring, a bar filling. */
  slow: 420,
} as const;

/** A spring for things being dragged or dropped, where distance varies. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.8,
};

/** The transition for a given duration token. */
export function ease(duration: keyof typeof MOTION_MS = "normal"): Transition {
  return { duration: MOTION_MS[duration] / 1000, ease: EASE_OUT };
}

/**
 * Fade and rise, the standard way things enter here.
 *
 * Kept as variants rather than as three props at each call site, so a surface
 * that enters differently is doing so on purpose.
 */
export const RISE = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
} as const;

/** Fade only, for anything whose position is already meaningful. */
export const FADE = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;
