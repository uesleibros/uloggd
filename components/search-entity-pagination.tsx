"use client";

import { shallowNavigate } from "@/components/shallow-link";
import { Pagination } from "@/components/pagination";
import type { UiLang } from "@/lib/ui-text";

export function SearchEntityPagination({
  page,
  totalPages,
  lang,
}: {
  page: number;
  totalPages: number;
  lang: UiLang;
}) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      lang={lang}
      className="entity-search-pagination"
      onGo={(next) => {
        const params = new URLSearchParams(window.location.search);
        if (next === 1) params.delete("page");
        else params.set("page", String(next));
        shallowNavigate(
          `${window.location.pathname}${params.size ? `?${params}` : ""}`,
        );
      }}
    />
  );
}
