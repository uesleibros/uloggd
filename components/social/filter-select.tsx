"use client";

import * as Select from "@/components/ui/select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type FilterOption = {
  value: string;
  label: string;
  /**
   * Drawn beside the label. Every option in every select here carries one, so
   * a menu does not read as half-finished: some had icons and others did not,
   * which looks like a mistake even when each is individually fine.
   */
  icon?: ReactNode;
};

/**
 * The dropdown the workspace filter rows are built from.
 *
 * Extracted from the reviews controls so screenshots use the same one rather
 * than an approximation of it. Two filter rows that are nearly identical read
 * worse than two that are obviously different: the eye notices the four-pixel
 * discrepancy and reads it as a mistake.
 *
 * The class names stay `reviews-*` because that is what the stylesheet calls
 * them, and renaming them across the stylesheet would be a larger and riskier
 * change than the one being made here.
 */
export function FilterSelect({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="reviews-filter-trigger" aria-label={label}>
        {icon}
        <span>{label}</span>
        <Select.Value />
        <Select.Icon className="reviews-filter-chevron">
          <ChevronDown size={13} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="reviews-filter-menu"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="reviews-filter-option"
                key={option.value}
                value={option.value}
              >
                {option.icon}
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={13} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
