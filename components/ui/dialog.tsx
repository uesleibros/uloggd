"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export const Root = BaseDialog.Root;
export const Portal = BaseDialog.Portal;
export const Overlay = BaseDialog.Backdrop;
export const Title = BaseDialog.Title;
export const Description = BaseDialog.Description;

type RenderableProps<T extends React.ElementType> = ComponentProps<T> & {
  asChild?: boolean;
  children?: ReactNode;
};

function withChild<T extends React.ElementType>(
  Component: T,
  { asChild, children, ...props }: RenderableProps<T>,
) {
  const render = asChild && children ? (children as ReactElement) : undefined;
  const Primitive = Component as React.ElementType;
  return (
    <Primitive {...props} render={render}>
      {render ? undefined : children}
    </Primitive>
  );
}

export function Trigger(props: RenderableProps<typeof BaseDialog.Trigger>) {
  return withChild(BaseDialog.Trigger, props);
}

export function Close(props: RenderableProps<typeof BaseDialog.Close>) {
  return withChild(BaseDialog.Close, props);
}

export function Content(props: ComponentProps<typeof BaseDialog.Popup>) {
  return <BaseDialog.Popup {...props} />;
}
