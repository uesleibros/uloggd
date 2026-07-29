"use client";

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-checked" | "onChange" | "role"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * A small shadcn-style switch kept intentionally native: a button with the
 * switch ARIA contract has no hidden form control that can inherit unrelated
 * input sizing from a parent form or modal.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    { checked, className, disabled, onClick, onCheckedChange, type, ...props },
    ref,
  ) {
    function toggle(event: MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (!event.defaultPrevented && !disabled) onCheckedChange?.(!checked);
    }

    return (
      <button
        {...props}
        ref={ref}
        type={type ?? "button"}
        role="switch"
        aria-checked={checked}
        data-checked={checked || undefined}
        data-disabled={disabled || undefined}
        disabled={disabled}
        className={cn("ui-switch", className)}
        onClick={toggle}
      >
        <span className="ui-switch-thumb" aria-hidden />
      </button>
    );
  },
);
