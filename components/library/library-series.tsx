"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, isReadAccessFailure } from "@/lib/api-client";
import type { SeriesAnswer } from "@/lib/series-view";
import { LibrarySeriesView } from "./library-series-view";
import { LoadError } from "@/components/ui/load-error";
import { tri, type UiLang } from "@/lib/ui-text";

/** The short discovery summary. The full workspace has its own unbounded index. */
export function LibrarySeries({ lang }: { lang: UiLang }) {
  const params = useSearchParams();
  const hidden = params.get("shelf") === "series";
  const [answer, setAnswer] = useState<SeriesAnswer | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (hidden) return;
    const controller = new AbortController();
    void api
      .get<SeriesAnswer>("/library/series?summary=1", controller.signal)
      .then((value) => {
        setAnswer(value);
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isReadAccessFailure(error)) setAnswer(null);
        setFailed(true);
      });
    return () => controller.abort();
  }, [hidden, attempt]);
  if (hidden) return null;
  return (
    <>
      {failed && (
        <LoadError
          lang={lang}
          what={tri(lang, "as séries", "the series", "las series")}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {answer && (
        <LibrarySeriesView
          shelves={answer.data}
          ignored={answer.ignored}
          lang={lang}
        />
      )}
    </>
  );
}
