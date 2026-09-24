"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Whether whoever is reading this page moderates the platform.
 *
 * Every removal control asks this rather than being handed a `staff` prop from
 * the page it happens to be on. Threading the prop is how a review ends up
 * removable from its own page and from nowhere else: a card in a feed is four
 * components away from anything that knows who is reading.
 *
 * It is only ever used to draw a control. Nothing is authorised by it: the
 * definer functions behind `/api/moderation` refuse anybody who is not staff,
 * so a browser that lies to itself gets a button that answers 403.
 *
 * The role is read once per tab rather than on the server for every page. It
 * lives behind a definer function, so asking for it on the server means an
 * extra read before the shell can be sent, on every page, for every reader,
 * to draw something almost nobody can see. A signed-out visitor asks nothing
 * at all.
 */
type Viewer = { staff: boolean; viewerId: string | null };

const StaffContext = createContext<Viewer>({ staff: false, viewerId: null });

/** Remembered for the tab, so a page change does not ask again. */
let known: boolean | null = null;
const KEY = "uloggd:staff";

/**
 * Works out the answer once, off the render path.
 *
 * Asynchronous all the way through, including the two cases that already know
 * the answer, so nothing here sets state synchronously inside an effect and
 * sends React round again before the first paint.
 */
async function resolveStaff(signedIn: boolean): Promise<boolean> {
  if (!signedIn) {
    known = false;
    return false;
  }
  if (known !== null) return known;
  // Survives a reload within the tab; blocked storage only costs a read.
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored !== null) {
      known = stored === "1";
      return known;
    }
  } catch {
    // Private window, or storage refused: ask instead of remembering.
  }
  try {
    const answer = await fetch("/api/v1/me");
    const payload = answer.ok ? await answer.json() : null;
    const role = payload?.owner?.role;
    known = role === "MODERATOR" || role === "ADMIN";
  } catch {
    // No answer means no controls, which is the safe way to be wrong.
    known = false;
  }
  try {
    window.sessionStorage.setItem(KEY, known ? "1" : "0");
  } catch {
    // Not remembering is fine; it is one read per tab at worst.
  }
  return known;
}

export function StaffProvider({
  signedIn,
  viewerId,
  children,
}: {
  signedIn: boolean;
  /** Carried here so a card never has to be told who is reading it. */
  viewerId: string | null;
  children: React.ReactNode;
}) {
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolveStaff(signedIn).then((is) => {
      if (!cancelled) setStaff(is);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return <StaffContext value={{ staff, viewerId }}>{children}</StaffContext>;
}

export function useStaff() {
  return useContext(StaffContext);
}
