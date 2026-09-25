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

/**
 * Remembered for the tab, against the account it was asked about.
 *
 * Both halves are keyed by the reader's id. Neither was, and the answer was
 * simply "uloggd:staff": signing out left it behind, and the next account to
 * sign in in that tab inherited it. A moderator signing out and a normal
 * account signing in meant removal controls on somebody who could not remove
 * anything, all of which answered 403, and the same mistake the other way
 * around hid the controls from staff.
 */
let known: { id: string; staff: boolean } | null = null;
const KEY = "uloggd:staff";

/**
 * Works out the answer once, off the render path.
 *
 * Asynchronous all the way through, including the cases that already know the
 * answer, so nothing here sets state synchronously inside an effect and sends
 * React round again before the first paint.
 */
async function resolveStaff(viewerId: string | null): Promise<boolean> {
  if (!viewerId) {
    // Signed out: forget, rather than keeping an answer about whoever was
    // here before. This is the line that makes signing out take effect.
    known = null;
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      // Storage refused, which only means there was nothing to forget.
    }
    return false;
  }
  if (known?.id === viewerId) return known.staff;
  // Survives a reload within the tab; blocked storage only costs a read.
  try {
    const stored = window.sessionStorage.getItem(KEY);
    const [id, flag] = (stored ?? "").split(":");
    if (id === viewerId && (flag === "1" || flag === "0")) {
      known = { id: viewerId, staff: flag === "1" };
      return known.staff;
    }
  } catch {
    // Private window, or storage refused: ask instead of remembering.
  }
  let staff = false;
  try {
    const answer = await fetch("/api/v1/me");
    const payload = answer.ok ? await answer.json() : null;
    const role = payload?.owner?.role;
    staff = role === "MODERATOR" || role === "ADMIN";
  } catch {
    // No answer means no controls, which is the safe way to be wrong.
  }
  known = { id: viewerId, staff };
  try {
    window.sessionStorage.setItem(KEY, `${viewerId}:${staff ? "1" : "0"}`);
  } catch {
    // Not remembering is fine; it is one read per tab at worst.
  }
  return staff;
}

export function StaffProvider({
  signedIn,
  viewerId,
  children,
}: {
  /** Kept for the callers that say so; `viewerId` is what decides. */
  signedIn: boolean;
  /** Carried here so a card never has to be told who is reading it. */
  viewerId: string | null;
  children: React.ReactNode;
}) {
  const reader = signedIn ? viewerId : null;
  // The answer carries who it is about, and a mismatch reads as "not staff".
  // Resetting it when the reader changes would mean setting state inside the
  // effect below, which is the cascading render this file already avoids.
  const [answer, setAnswer] = useState<{ id: string | null; staff: boolean }>({
    id: null,
    staff: false,
  });
  const staff = answer.id === reader && answer.staff;

  useEffect(() => {
    let cancelled = false;
    void resolveStaff(reader).then((is) => {
      if (!cancelled) setAnswer({ id: reader, staff: is });
    });
    return () => {
      cancelled = true;
    };
  }, [reader]);

  return <StaffContext value={{ staff, viewerId }}>{children}</StaffContext>;
}

export function useStaff() {
  return useContext(StaffContext);
}
