export type ApiErrorCode =
  | "unauthorized"
  | "invalid_key"
  | "key_revoked"
  | "key_expired"
  | "insufficient_scope"
  | "rate_limited"
  | "not_found"
  | "invalid_request"
  | "conflict"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  invalid_key: 401,
  key_revoked: 401,
  key_expired: 401,
  insufficient_scope: 403,
  rate_limited: 429,
  not_found: 404,
  invalid_request: 400,
  conflict: 409,
  internal: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
) {
  return Response.json(
    { error: { code, message, ...extra } },
    { status: STATUS[code] },
  );
}
