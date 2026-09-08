import { ApiFailure } from "./route";
export function gameIds(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = raw.split(",").map(Number);
  if (
    !raw ||
    ids.length > 200 ||
    ids.some((id) => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)
  )
    throw new ApiFailure(
      "invalid_request",
      "ids must contain 1 to 200 positive game ids.",
    );
  return [...new Set(ids)];
}
