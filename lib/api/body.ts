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

export function optionalTime(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value))
    throw new ApiFailure(
      "invalid_request",
      `${field} must be a time of day as HH:MM or HH:MM:SS.`,
    );
  return value.length === 5 ? `${value}:00` : value;
}

const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function optionalUuid(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !UUID_TEXT.test(value))
    throw new ApiFailure("invalid_request", `${field} must be an id.`);
  return value;
}

export function optionalUuidList(
  body: Record<string, unknown>,
  field: string,
  most: number,
) {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > most ||
    value.some((one) => typeof one !== "string" || !UUID_TEXT.test(one))
  )
    throw new ApiFailure(
      "invalid_request",
      `${field} must be a list of 1 to ${most} ids.`,
    );
  return value as string[];
}

/**
 * Whether the caller asked for a field to be emptied.
 *
 * Every other reader here treats `null` and absent alike, which is what makes
 * a partial update partial. A field that can legitimately hold nothing needs
 * the two told apart, and only the raw body can tell them apart.
 */
export function clearing(body: Record<string, unknown>, field: string) {
  return field in body && body[field] === null;
}
