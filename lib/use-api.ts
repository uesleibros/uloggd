"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export type ApiState<T> = {
  /**
   * The whole answer, envelope included.
   *
   * Every v1 route answers `{ data }`, and several answer more beside it: a
   * collection adds its count, the wallet adds the level. Unwrapping here would
   * throw those away, so the envelope arrives intact and the caller reads the
   * part it wants.
   */
  payload: T | null;
  error: unknown;
  /** True until this path's own answer lands. */
  loading: boolean;
};

/**
 * One read from our own API, for a section that fills itself in.
 *
 * The home page used to await every shelf before sending a byte of the body, so
 * the whole page was as slow as its slowest read and a visitor watched a
 * full-page skeleton until all of them finished. A shelf that asks for its own
 * slice can show its own skeleton, and the page is legible immediately with the
 * parts arriving as they resolve.
 *
 * Pass `null` as the path to mean "not for this visitor": a shelf that only
 * exists for a signed-in account skips the request rather than asking and
 * handling a 401.
 *
 * The answer remembers which path produced it, and `loading` is derived from
 * comparing that with the path being asked for now. That is what keeps this from
 * setting state inside the effect: a new path reads as loading on the very
 * render that changes it, without a second pass to say so, and a stale answer
 * can never be shown under a new question.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [answer, setAnswer] = useState<{
    path: string;
    payload: T | null;
    error: unknown;
  } | null>(null);

  useEffect(() => {
    if (path === null) return;

    // A flag rather than an AbortController. Two sections often want the same
    // answer, and `api.get` shares a read that is already in flight, which it
    // cannot do for a caller holding the power to cancel it for everybody. What
    // actually needed preventing is a late answer landing on a section that has
    // moved on, and that is this flag plus the path check below.
    let listening = true;

    api
      .get<T>(path)
      .then((payload) => {
        if (listening) setAnswer({ path, payload, error: null });
      })
      .catch((error) => {
        if (listening) setAnswer({ path, payload: null, error });
      });

    return () => {
      listening = false;
    };
  }, [path]);

  const current = answer && answer.path === path ? answer : null;
  return {
    payload: current?.payload ?? null,
    error: current?.error ?? null,
    loading: path !== null && current === null,
  };
}
