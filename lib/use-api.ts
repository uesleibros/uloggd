"use client";

import { useEffect, useState } from "react";
import { api, isReadAccessFailure } from "@/lib/api-client";

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
  /**
   * The payload belongs to an earlier path or attempt, kept on screen while
   * the current read loads or fails. Only ever true with `keepPrevious`.
   */
  stale: boolean;
  /** Access was lost. Remains true during a retry until a success arrives. */
  invalidated: boolean;
  /** Ask again, for a section showing an error with a way to retry. */
  reload: () => void;
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
export function useApi<T>(
  path: string | null,
  {
    keepPrevious = false,
  }: {
    /**
     * Keep showing the last successful answer while a new path loads or fails.
     *
     * For a section whose path changes under the reader: a filter tab, a page
     * number. Without it every click showed content, then a skeleton, then new
     * content, which reads as the page flickering rather than responding. The
     * skeleton belongs to the first load, when there is nothing to show yet.
     */
    keepPrevious?: boolean;
  } = {},
): ApiState<T> {
  type Answer = {
    path: string;
    attempt: number;
    payload: T | null;
    error: unknown;
  };
  const [{ answer, lastSuccess }, setAnswers] = useState<{
    answer: Answer | null;
    lastSuccess: Answer | null;
  }>({ answer: null, lastSuccess: null });
  // Part of the question: asking the same path again is a new attempt, and an
  // answer to an older attempt is not an answer to this one.
  const [attempt, setAttempt] = useState(0);

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
        if (listening) {
          const answer = { path, attempt, payload, error: null };
          setAnswers({ answer, lastSuccess: answer });
        }
      })
      .catch((error) => {
        if (listening)
          setAnswers((previous) => ({
            ...previous,
            lastSuccess: isReadAccessFailure(error)
              ? null
              : previous.lastSuccess,
            answer: { path, attempt, payload: null, error },
          }));
      });

    return () => {
      listening = false;
    };
  }, [path, attempt]);

  const current =
    answer && answer.path === path && answer.attempt === attempt
      ? answer
      : null;
  const shown =
    current?.error === null
      ? current
      : keepPrevious && path !== null
        ? lastSuccess
        : null;
  return {
    payload: shown?.payload ?? null,
    error: current?.error ?? null,
    loading: path !== null && current === null,
    stale: shown !== null && shown !== current,
    invalidated: isReadAccessFailure(answer?.error),
    reload: () => setAttempt((value) => value + 1),
  };
}
