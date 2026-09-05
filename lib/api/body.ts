import { ApiFailure } from "./route";

export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (!raw.trim()) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new ApiFailure("invalid_request", "The body must be a JSON object.");
  }
}

export function requireInt(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (!Number.isSafeInteger(value))
    throw new ApiFailure("invalid_request", `${field} must be a whole number.`);
  return value as number;
}

export function requireSlug(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== "string" || !/^[a-z0-9-]{1,80}$/.test(value))
    throw new ApiFailure("invalid_request", `${field} must be a game slug.`);
  return value;
}

export function optionalText(
  body: Record<string, unknown>,
  field: string,
  max: number,
) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > max)
    throw new ApiFailure(
      "invalid_request",
      `${field} must be text of at most ${max} characters.`,
    );
  return value;
}

export function optionalBool(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean")
    throw new ApiFailure("invalid_request", `${field} must be true or false.`);
  return value;
}

export function optionalInt(
  body: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    throw new ApiFailure(
      "invalid_request",
      `${field} must be a whole number between ${min} and ${max}.`,
    );
  return value as number;
}

export function optionalOneOf<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !allowed.includes(value as T))
    throw new ApiFailure(
      "invalid_request",
      `${field} must be one of ${allowed.join(", ")}.`,
    );
  return value as T;
}

export function optionalDate(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ApiFailure(
      "invalid_request",
      `${field} must be a date as YYYY-MM-DD.`,
    );
  return value;
}

export function optionalStep(
  body: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  step: number,
) {
  const value = optionalInt(body, field, min, max);
  if (value === null) return null;
  if (value % step !== 0)
    throw new ApiFailure(
      "invalid_request",
      `${field} must be a multiple of ${step}, from ${min} to ${max}.`,
    );
  return value;
}
