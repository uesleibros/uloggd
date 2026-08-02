"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfileLevels, type ProfileLevel } from "@/lib/profile-level";

/**
 * Levels for the authors on screen, in one request.
 *
 * For lists that load their own rows, where the server could not have fetched
 * the levels alongside them. Comment threads are the case this exists for: a
 * thread has as many authors as it has replies, and a badge that cost a
 * request each would be thirty aggregates to decorate thirty names.
 *
 * Keyed on the sorted ids rather than the array, since a list rebuilt on every
 * render is a new array every time and would re-fetch forever.
 */
export function useProfileLevels(profileIds: string[]) {
  const key = useMemo(
    () => [...new Set(profileIds.filter(Boolean))].sort().join(","),
    [profileIds],
  );
  const [levels, setLevels] = useState<Map<string, ProfileLevel>>(new Map());

  useEffect(() => {
    if (!key) return;
    let active = true;
    getProfileLevels(createClient(), key.split(",")).then((result) => {
      // The badge is decoration on a list that has already rendered, so a
      // failure resolves to an empty map and simply shows no badges.
      if (active) setLevels(result);
    });
    return () => {
      active = false;
    };
  }, [key]);

  return levels;
}
