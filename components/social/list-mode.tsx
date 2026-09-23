"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Whether a list is being edited, read from the address.
 *
 * Switching between viewing and editing used to be a link to `?edit=1` that
 * the server answered by drawing the whole page again: the list, every cover
 * from IGDB and the owner's library, all of it already on screen. The switch
 * moves the address without the server now (see ListViewMode), and everything
 * that differs between the two modes reads it from here, so a reload or a
 * shared link still opens in the mode it was left in.
 */
export function useListEditing() {
  // Null outside the app router, when the component is drawn on its own.
  return useSearchParams()?.get("edit") === "1";
}

/** Draws its children only while the list is being edited. */
export function WhenListEditing({ children }: { children: ReactNode }) {
  return useListEditing() ? children : null;
}
