"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

/**
 * Hover/focus hint for icon-only controls, replacing the native `title`
 * attribute — which cannot be styled, takes about a second to appear, and is
 * skipped by several screen readers.
 *
 * The trigger keeps an `aria-label` of its own for assistive tech, so the
 * tooltip itself is purely visual (`aria-hidden` content) and never becomes
 * the only way to know what a control does.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  sideOffset = 6,
}: {
  label: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}) {
  if (!label) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          className="app-tooltip"
          side={side}
          sideOffset={sideOffset}
          collisionPadding={8}
        >
          {label}
          <RadixTooltip.Arrow className="app-tooltip-arrow" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={350} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  );
}
