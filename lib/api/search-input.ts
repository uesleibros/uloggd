import { ApiFailure } from "./route";
export function entitySearch(request: Request, sorts: readonly string[]) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1),
    query = (params.get("q") ?? "").trim().slice(0, 80),
    sort = params.get("sort") ?? sorts[0];
  if (!Number.isInteger(page) || page < 1 || page > 100)
    throw new ApiFailure("invalid_request", "page must be between 1 and 100.");
  if (!sorts.includes(sort))
    throw new ApiFailure("invalid_request", "That sort is not supported.");
  return { page, query, sort };
}
