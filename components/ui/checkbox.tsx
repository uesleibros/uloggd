"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root className={cn("ui-checkbox", className)} {...props}>
      <BaseCheckbox.Indicator className="ui-checkbox-indicator" keepMounted>
        <Check size={12} strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
