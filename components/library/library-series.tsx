"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError, isReadAccessFailure } from "@/lib/api-client";
import type { SeriesAnswer } from "@/lib/series-view";
import { LibrarySeriesView } from "./library-series-view";
import { LibrarySeriesSkeleton } from "./library-skeleton";
import { LoadError } from "@/components/ui/load-error";
import { tri, type UiLang } from "@/lib/ui-text";

/** The short discovery summary. The full workspace has its own unbounded index. */
export function LibrarySeries({ lang }: { lang: UiLang }) {
  const params = useSearchParams();
  const hidden = params.get("shelf") === "series";
  const [answer, setAnswer] = useState<SeriesAnswer | null>(null);
  const [limited, setLimited] = useState(false);
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
        setLimited(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLimited(error instanceof ApiError && error.code === "rate_limited");
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
          message={
            limited
              ? tri(
                  lang,
                  "O catálogo está temporariamente ocupado. Tente novamente em alguns instantes.",
                  "The catalogue is temporarily busy. Try again in a moment.",
                  "El catálogo está temporalmente ocupado. Inténtalo en unos instantes.",
                )
              : undefined
          }
          what={tri(lang, "as séries", "the series", "las series")}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {!answer && !failed && <LibrarySeriesSkeleton lang={lang} />}
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
