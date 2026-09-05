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
export const LIST_ID = /^[0-9a-zA-Z_-]{1,64}$/;
