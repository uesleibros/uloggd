"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export function Root({ onValueChange, ...props }: Record<string, unknown> & {
  onValueChange?: (value: string) => void;
}) {
  return (
    <BaseSelect.Root
      {...props}
      onValueChange={(value) => {
        if (value !== null) onValueChange?.(String(value));
      }}
    />
  );
}
export const Value = BaseSelect.Value;
export const Icon = BaseSelect.Icon;
export const Portal = BaseSelect.Portal;
export const Viewport = BaseSelect.List;
export const ItemText = BaseSelect.ItemText;
export const ItemIndicator = BaseSelect.ItemIndicator;
export const Group = BaseSelect.Group;
export const Label = BaseSelect.GroupLabel;
export const Separator = "div";
export const ScrollUpButton = BaseSelect.ScrollUpArrow;
export const ScrollDownButton = BaseSelect.ScrollDownArrow;

type ChildProps<T extends React.ElementType> = ComponentProps<T> & {
  asChild?: boolean;
  children?: ReactNode;
};

function withChild<T extends React.ElementType>(
  Component: T,
  { asChild, children, ...props }: ChildProps<T>,
) {
  const render = asChild && children ? (children as ReactElement) : undefined;
  const Primitive = Component as React.ElementType;
  return (
    <Primitive {...props} render={render}>
      {render ? undefined : children}
    </Primitive>
  );
}

export function Trigger(props: ChildProps<typeof BaseSelect.Trigger>) {
  return withChild(BaseSelect.Trigger, props);
}

export function Item(props: ChildProps<typeof BaseSelect.Item>) {
  return withChild(BaseSelect.Item, props);
}

export function Content({
  side,
  align,
  sideOffset,
  alignOffset,
  collisionPadding,
  position,
  ...props
}: ComponentProps<typeof BaseSelect.Popup> & {
  side?: ComponentProps<typeof BaseSelect.Positioner>["side"];
  align?: ComponentProps<typeof BaseSelect.Positioner>["align"];
  sideOffset?: ComponentProps<typeof BaseSelect.Positioner>["sideOffset"];
  alignOffset?: ComponentProps<typeof BaseSelect.Positioner>["alignOffset"];
  collisionPadding?: number;
  position?: string;
}) {
  // The legacy API called this positioning mode `popper`; Base UI always positions
  // through Positioner, so the compatibility prop is intentionally consumed.
  void position;
  return (
    <BaseSelect.Positioner
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      collisionPadding={collisionPadding}
    >
      <BaseSelect.Popup {...props} />
    </BaseSelect.Positioner>
  );
}
