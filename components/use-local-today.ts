"use client";

import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/local-date";

/**
 * Resolves "today" only after hydration so a UTC deployment cannot render a
 * different calendar day than the viewer's browser.
 */
export function useLocalToday() {
  const [today, setToday] = useState("");

  useEffect(() => {
    const update = () => setToday(localDateKey());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return today;
}
