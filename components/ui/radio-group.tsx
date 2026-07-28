"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function RadioGroup<Value>({
  className,
  ...props
}: ComponentProps<typeof BaseRadioGroup<Value>>) {
  return (
    <BaseRadioGroup<Value>
      className={cn("ui-radio-group", className)}
      {...props}
    />
  );
}

export function RadioGroupItem<Value>({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseRadio.Root<Value>>) {
  return (
    <BaseRadio.Root<Value>
      className={cn("ui-radio-item", className)}
      {...props}
    >
      {children}
      <BaseRadio.Indicator className="ui-radio-indicator" keepMounted />
    </BaseRadio.Root>
  );
}
