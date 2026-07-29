"use client";

import type { ReactNode } from "react";

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
        <button
          key={item.value}
          type="button"
          data-motion="none"
          data-active={value === item.value || undefined}
          aria-pressed={value === item.value}
          aria-label={item.label}
          title={item.label}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}
