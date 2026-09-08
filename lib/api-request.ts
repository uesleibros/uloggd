import { ApiError } from "@/lib/api-client";
export function requestApi(origin: string, cookie = "") {
  return {
    async get<T>(path: string): Promise<T> {
      const response = await fetch(origin + "/api/v1" + path, {
        headers: cookie ? { cookie } : {},
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new ApiError(
          payload.error?.code ?? "internal",
          payload.error?.message ?? "The request could not be completed.",
          response.status,
        );
      return payload as T;
    },
  };
}
