"use client";

import { useEffect } from "react";

// Browser noise with no server-side action: extension/cross-origin script
// errors, aborted fetches (navigation cancels them), and the benign
// ResizeObserver loop warning.
const IGNORED = [
  "Script error",
  "ResizeObserver loop",
  "AbortError",
  "The operation was aborted",
];

/**
 * Ships uncaught client errors and unhandled promise rejections to
 * /api/telemetry, so a failure that never reaches a React error boundary still
 * lands in the server logs. Deduped and capped per page so one repeating error
 * cannot flood the endpoint.
 */
export function ClientErrorReporter() {
  useEffect(() => {
    const seen = new Set<string>();
    let sent = 0;

    const report = (message: string, stack?: string) => {
      if (!message || sent >= 25) return;
      if (IGNORED.some((needle) => message.includes(needle))) return;
      const key = message.slice(0, 200);
      if (seen.has(key)) return;
      seen.add(key);
      sent += 1;
      void fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.slice(0, 500),
          stack: stack?.slice(0, 4000),
          path: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const onError = (event: ErrorEvent) =>
      report(event.message || String(event.error), event.error?.stack);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; stack?: string };
      report(
        `Unhandled rejection: ${reason?.message ?? String(event.reason)}`,
        reason?.stack,
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
