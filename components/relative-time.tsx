"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatRelativeTime } from "@/lib/relative-time";
import type { UiLang } from "@/lib/ui-text";

export function RelativeTime({
  value,
  lang,
  className,
  children,
}: {
  value: string;
  lang: UiLang;
  className?: string;
  children?: ReactNode;
}) {
  const [, update] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => update((tick) => tick + 1),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <time className={className} dateTime={value} suppressHydrationWarning>
      {formatRelativeTime(value, lang)}
      {children}
    </time>
  );
}
