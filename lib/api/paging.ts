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

export function pageMeta(
  page: number,
  rows: Counted[],
  size = PAGE_SIZE,
): Page {
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / size));
  return {
    number: page,
    size,
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

/**
 * How many rows to bring back, as a whole number.
 *
 * `Number.isFinite` says yes to 1.5, and `limit 1.5` is not something Postgres
 * will do: it raises, and a caller who asked for a page and a half gets a 500
 * describing the database instead of a 400 describing their request.
 */
export function countedLimit(request: Request, fallback: number, most: number) {
  const asked = new URL(request.url).searchParams.get("limit");
  if (asked === null || asked === "") return fallback;
  const value = Number(asked);
  if (!Number.isInteger(value) || value < 1 || value > most)
    throw new ApiFailure(
      "invalid_request",
      `limit must be a whole number from 1 to ${most}.`,
    );
  return value;
}
