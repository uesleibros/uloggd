"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps, ReactElement, ReactNode } from "react";

/**
 * A small surface opened from a control, for things a menu cannot hold.
 *
 * The dropdown wrapper is a menu: its children are menu items, and a screen
 * reader is told so. A swatch grid and a set of modes is not a menu, and
 * putting it in one is how a control ends up announcing "menu item" about a
 * colour. This is the same wrapper shape, over Base UI's popover.
 */
export const Root = BasePopover.Root;
export const Portal = BasePopover.Portal;
export const Title = BasePopover.Title;
export const Description = BasePopover.Description;
export const Close = BasePopover.Close;

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

export function Trigger(props: ChildProps<typeof BasePopover.Trigger>) {
  return withChild(BasePopover.Trigger, props);
}

export function Content({
  side,
  align,
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: ComponentProps<typeof BasePopover.Popup> & {
  side?: ComponentProps<typeof BasePopover.Positioner>["side"];
  align?: ComponentProps<typeof BasePopover.Positioner>["align"];
  sideOffset?: number;
  collisionPadding?: number;
}) {
  return (
    <BasePopover.Positioner
      className="ui-popover-positioner"
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
    >
      <BasePopover.Popup {...props} />
    </BasePopover.Positioner>
  );
}
