"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";

export function ViewSwitch<T extends string>({
  value,
  label,
  items,
  onChange,
}: {
  value: T;
  label: string;
  items: Array<{ value: T; label: string; icon: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="view-switch" role="group" aria-label={label}>
      {items.map((item) => (
        <Tooltip key={item.value} label={item.label}>
          <button
            type="button"
            data-motion="none"
            data-active={value === item.value || undefined}
            aria-pressed={value === item.value}
            aria-label={item.label}
            onClick={() => onChange(item.value)}
          >
            {item.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
