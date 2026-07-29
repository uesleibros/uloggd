"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
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
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className="app-tooltip-positioner"
          side={side}
          sideOffset={sideOffset}
          collisionPadding={8}
        >
          <BaseTooltip.Popup className="app-tooltip">
            {label}
            <BaseTooltip.Arrow className="app-tooltip-arrow" />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <BaseTooltip.Provider delay={350} closeDelay={0} timeout={300}>
      {children}
    </BaseTooltip.Provider>
  );
}
