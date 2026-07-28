"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

type RootProps = Record<string, unknown> & {
  children?: ReactNode;
  items?: ComponentProps<typeof BaseSelect.Root>["items"];
  modal?: boolean;
  onValueChange?: (value: string) => void;
};

function findItemText(node: ReactNode): ReactNode | undefined {
  let label: ReactNode | undefined;

  Children.forEach(node, (child) => {
    if (label !== undefined || !isValidElement(child)) return;

    if (child.type === BaseSelect.ItemText) {
      label = (child.props as { children?: ReactNode }).children;
      return;
    }

    label = findItemText((child.props as { children?: ReactNode }).children);
  });

  return label;
}

function collectItemLabels(node: ReactNode, labels: Record<string, ReactNode>) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;

    const childProps = child.props as {
      children?: ReactNode;
      value?: unknown;
    };

    if (child.type === Item && childProps.value != null) {
      const label = findItemText(childProps.children);
      if (label !== undefined) labels[String(childProps.value)] = label;
      return;
    }

    collectItemLabels(childProps.children, labels);
  });
}

export function Root({
  children,
  items,
  modal = false,
  onValueChange,
  ...props
}: RootProps) {
  const inferredItems: Record<string, ReactNode> = {};
  if (items === undefined) collectItemLabels(children, inferredItems);
  const resolvedItems =
    items ??
    (Object.keys(inferredItems).length > 0 ? inferredItems : undefined);

  return (
    <BaseSelect.Root
      {...props}
      items={resolvedItems}
      modal={modal}
      onValueChange={(value) => {
        if (value !== null) onValueChange?.(String(value));
      }}
    >
      {children}
    </BaseSelect.Root>
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
  // The legacy `popper` mode places the menu beside the trigger. Base UI's
  // default aligns the selected item over the trigger, so translate that mode
  // explicitly instead of silently discarding it.
  return (
    <BaseSelect.Positioner
      className="ui-select-positioner"
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      collisionPadding={collisionPadding}
      alignItemWithTrigger={position !== "popper"}
    >
      <BaseSelect.Popup {...props} />
    </BaseSelect.Positioner>
  );
}
