"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export const Root = BaseMenu.Root;
export const Portal = BaseMenu.Portal;
export const Group = BaseMenu.Group;
export const Label = BaseMenu.GroupLabel;
export const Separator = "div";
export const RadioGroup = BaseMenu.RadioGroup;
export const ItemIndicator = BaseMenu.RadioItemIndicator;
export const Arrow = BaseMenu.Arrow;
export const Sub = BaseMenu.SubmenuRoot;

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

export function Trigger(props: ChildProps<typeof BaseMenu.Trigger>) {
  return withChild(BaseMenu.Trigger, props);
}

export function Item({
  onSelect,
  ...props
}: Omit<ChildProps<typeof BaseMenu.Item>, "onSelect"> & {
  onSelect?: ComponentProps<typeof BaseMenu.Item>["onClick"];
}) {
  return withChild(BaseMenu.Item, { ...props, onClick: onSelect ?? props.onClick });
}

export function CheckboxItem(
  {
    onSelect,
    ...props
  }: Omit<ChildProps<typeof BaseMenu.CheckboxItem>, "onSelect"> & {
    onSelect?: ComponentProps<typeof BaseMenu.CheckboxItem>["onClick"];
  },
) {
  return withChild(BaseMenu.CheckboxItem, { ...props, onClick: onSelect ?? props.onClick });
}

export function RadioItem(props: ChildProps<typeof BaseMenu.RadioItem>) {
  return withChild(BaseMenu.RadioItem, props);
}

export function SubTrigger(props: ChildProps<typeof BaseMenu.SubmenuTrigger>) {
  return withChild(BaseMenu.SubmenuTrigger, props);
}

export const SubContent = Content;

export function Content({
  side,
  align,
  sideOffset,
  alignOffset,
  collisionPadding,
  ...props
}: ComponentProps<typeof BaseMenu.Popup> & {
  side?: ComponentProps<typeof BaseMenu.Positioner>["side"];
  align?: ComponentProps<typeof BaseMenu.Positioner>["align"];
  sideOffset?: ComponentProps<typeof BaseMenu.Positioner>["sideOffset"];
  alignOffset?: ComponentProps<typeof BaseMenu.Positioner>["alignOffset"];
  collisionPadding?: ComponentProps<typeof BaseMenu.Positioner>["collisionPadding"];
}) {
  return (
    <BaseMenu.Positioner
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      collisionPadding={collisionPadding}
    >
      <BaseMenu.Popup {...props} />
    </BaseMenu.Positioner>
  );
}
