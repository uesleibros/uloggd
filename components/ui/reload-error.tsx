"use client";

import { useRouter } from "next/navigation";
import { LoadError } from "@/components/ui/load-error";
import type { UiLang } from "@/lib/ui-text";

/**
 * A failed read in a part of the page the server drew.
 *
 * `LoadError` asks its caller how to try again, and a server component has no
 * function to hand it. Trying again here means drawing the page again, which
 * is what a refresh of the route does without losing the scroll or the rest
 * of what is on screen.
 */
export function ReloadError({ lang, what }: { lang: UiLang; what?: string }) {
  const router = useRouter();
  return <LoadError lang={lang} what={what} onRetry={() => router.refresh()} />;
}
