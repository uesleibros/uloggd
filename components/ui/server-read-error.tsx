"use client";

import { useRouter } from "next/navigation";
import { LoadError } from "./load-error";
import type { UiLang } from "@/lib/ui-text";

/** Retry a server panel whose read did not produce a usable snapshot. */
export function ServerReadError({
  lang,
  what,
}: {
  lang: UiLang;
  what: string;
}) {
  const router = useRouter();
  return <LoadError lang={lang} what={what} onRetry={() => router.refresh()} />;
}
