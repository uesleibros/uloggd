/**
 * The session somebody has open, as the browser knows it.
 *
 * One session at a time, per account, which is what makes a single persistent
 * element the right shape for it. The bar lives in the layout and survives
 * navigation; anything that starts or ends a session is somewhere else
 * entirely, so they meet over an event on `window` rather than through a
 * context that would have to be threaded past the layout boundary.
 */

export type PlayEventKind = "NOTE" | "SHOT" | "PROGRESS" | "STOP";

export type PlayEvent = {
  id: string;
  kind: PlayEventKind;
  body: string | null;
  marker: string | null;
  screenshot_id: string | null;
  at: string;
};

export type OpenSession = {
  id: string;
  public_id: string;
  igdb_id: number;
  game_slug: string;
  played_on: string;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  journey_id: string | null;
  note: string | null;
  open_since: string;
  events: PlayEvent[];
  game: { id: number; slug: string; name: string; cover_url: string } | null;
};

export const PLAY_SESSION_EVENT = "uloggd:play-session";

/** Null says there is no longer one, which is as much news as a new one. */
export function announcePlaySession(session: OpenSession | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenSession | null>(PLAY_SESSION_EVENT, {
      detail: session,
    }),
  );
}

/** Minutes since it opened, which is the clock the bar shows. */
export function elapsedMinutes(openSince: string, now = Date.now()) {
  const started = new Date(openSince).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 60000));
}

export function formatElapsed(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}
