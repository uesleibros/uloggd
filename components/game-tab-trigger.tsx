"use client";

import type { ReactNode } from "react";

export function GameTabTrigger({
  tab,
  className,
  children,
}: {
  tab: "spawnd";
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("uloggd:open-game-tab", { detail: tab }),
        )
      }
    >
      {children}
    </button>
  );
}
