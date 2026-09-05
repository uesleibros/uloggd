import { ApiFailure } from "./route";
import type { Page } from "./shapes";

export const PAGE_SIZE = 50;

export function requestedPage(request: Request) {
  const raw = new URL(request.url).searchParams.get("page") ?? "1";
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
    throw new ApiFailure(
      "invalid_request",
      "page must be a whole number between 1 and 1000.",
    );
  return page;
}

export function offsetFor(page: number) {
  return (page - 1) * PAGE_SIZE;
}

type Counted = { total_count?: string | number };

export function pageMeta(page: number, rows: Counted[]): Page {
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return {
    number: page,
    size: PAGE_SIZE,
    total_items: total,
    total_pages: totalPages,
    has_more: page < totalPages,
  };
}

export function withoutCount<T extends Counted>(rows: T[]) {
  return rows.map((row) => {
    const copy = { ...row };
    delete copy.total_count;
    return copy;
  });
}
