"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export const Root = BaseMenu.Root;
export const Portal = BaseMenu.Portal;
export const Group = BaseMenu.Group;
export const Separator = BaseMenu.Separator;
export const RadioGroup = BaseMenu.RadioGroup;
export const ItemIndicator = BaseMenu.CheckboxItemIndicator;
export const Arrow = BaseMenu.Arrow;
export const Sub = BaseMenu.SubmenuRoot;

/**
 * The previous menu API allowed a presentation label directly inside Content.
 * Base UI's GroupLabel is stricter and throws outside Group, while these labels
 * do not label a grouped set. Keep their existing semantics without inventing
 * an unnecessary group around the rest of the menu.
 */
export function Label(props: ComponentProps<"div">) {
  return <div role="presentation" {...props} />;
}

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
  return withChild(BaseMenu.Item, {
    ...props,
    onClick: onSelect ?? props.onClick,
  });
}

export function CheckboxItem({
  onSelect,
  ...props
}: Omit<ChildProps<typeof BaseMenu.CheckboxItem>, "onSelect"> & {
  onSelect?: ComponentProps<typeof BaseMenu.CheckboxItem>["onClick"];
}) {
  return withChild(BaseMenu.CheckboxItem, {
    ...props,
    onClick: onSelect ?? props.onClick,
  });
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
  collisionPadding?: ComponentProps<
    typeof BaseMenu.Positioner
  >["collisionPadding"];
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
