"use client";

import { useEffect, useState } from "react";

/**
 * The current time, as something a render is allowed to read.
 *
 * Reading `Date.now()` while rendering is impure, and freezing it once at
 * mount is worse: the moderation console did that, so a tab left open across
 * the end of a ban went on calling the account banned and offering to unban
 * somebody the database had already let back in.
 *
 * This keeps the time in state and moves it on a timer, which is the same
 * thing `RelativeTime` does for the same reason. Thirty seconds is the default
 * because that is the resolution at which "banned until" stops being true.
 */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);

  return now;
}
