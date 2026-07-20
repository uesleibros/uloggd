"use client";

import * as RadixSelect from "@radix-ui/react-select";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

/**
 * Drop-in replacement for @radix-ui/react-select that fixes a touch bug.
 *
 * Radix only opens the menu on `pointerdown` when `pointerType === "mouse"`;
 * for touch it waits for the `click`. But `SelectContentImpl` arms a
 * document-level capture-phase `pointerup` listener whenever the trigger
 * recorded a pointer position — and on touch that listener is registered
 * *after* the opening gesture's own pointerup, so it survives to swallow the
 * next tap with `preventDefault()`. Since touch items also only select on
 * `click`, and `preventDefault()` on `pointerup` suppresses the click, the
 * first tap on an option does nothing and the menu appears stuck open.
 *
 * Opening on `pointerdown` ourselves keeps that position ref null, so the
 * guard never arms. Calling `preventDefault()` makes Radix skip its own
 * handler (see `composeEventHandlers`) and suppresses the synthetic click.
 */
const SetOpenContext = createContext<((open: boolean) => void) | null>(null);

export function Root({
  open,
  onOpenChange,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  return (
    <SetOpenContext.Provider value={setOpen}>
      <RadixSelect.Root
        {...props}
        open={isControlled ? open : uncontrolledOpen}
        onOpenChange={setOpen}
      >
        {children}
      </RadixSelect.Root>
    </SetOpenContext.Provider>
  );
}

export const Trigger = forwardRef<
  ElementRef<typeof RadixSelect.Trigger>,
  ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(function Trigger({ onPointerDown, onClick, ...props }, ref) {
  const setOpen = useContext(SetOpenContext);
  const openedByTouch = useRef(false);
  return (
    <RadixSelect.Trigger
      {...props}
      ref={ref}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        openedByTouch.current = false;
        if (event.defaultPrevented || props.disabled) return;
        if (event.pointerType === "mouse" || !setOpen) return;
        event.preventDefault();
        openedByTouch.current = true;
        event.currentTarget.focus();
        setOpen(true);
      }}
      onClick={(event) => {
        onClick?.(event);
        // Only reached if the browser still synthesised a click; letting Radix
        // handle it here would re-arm the very guard we just avoided.
        if (openedByTouch.current) {
          openedByTouch.current = false;
          event.preventDefault();
        }
      }}
    />
  );
});

export const {
  Value,
  Icon,
  Portal,
  Content,
  Viewport,
  Item,
  ItemText,
  ItemIndicator,
  Group,
  Label,
  Separator,
  ScrollUpButton,
  ScrollDownButton,
} = RadixSelect;
