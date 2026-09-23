import { ApiFailure } from "./route";

export function lastSegment(request: Request, label: string, pattern: RegExp) {
  const raw = decodeURIComponent(
    new URL(request.url).pathname.split("/").filter(Boolean).pop() ?? "",
  );
  if (!pattern.test(raw))
    throw new ApiFailure("invalid_request", `That is not a ${label}.`);
  return raw;
}

export function segmentBefore(
  request: Request,
  offset: number,
  label: string,
  pattern: RegExp,
) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const raw = decodeURIComponent(parts[parts.length - 1 - offset] ?? "");
  if (!pattern.test(raw))
    throw new ApiFailure("invalid_request", `That is not a ${label}.`);
  return raw;
}

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const HANDLE = /^[A-Za-z0-9_.-]{1,40}$/;
/**
 * A catalogue slug, which is not a handle.
 *
 * Companies were checked against HANDLE, an account's shape, forty characters
 * at most. IGDB's own go well past that ("nintendo-ead-tokyo-software-
 * development-group-no-dot-2" is fifty-four), so every visit to one of those
 * pages was refused here, the page it was drawing died with it, and the log
 * filled with "That is not a company slug". The bound matches the one the
 * catalogue reader uses.
 */
export const SLUG = /^[a-z0-9][a-z0-9-]{0,254}$/;
export const LIST_ID = /^[0-9a-zA-Z_-]{1,64}$/;
