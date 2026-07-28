"use client";

import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Toggle({
  className,
  ...props
}: ComponentProps<typeof BaseToggle>) {
  return <BaseToggle className={cn("ui-toggle", className)} {...props} />;
}
