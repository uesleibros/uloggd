import "server-only";
import { unstable_cache } from "next/cache";
import { serverApiOrigin } from "@/lib/api-server";
import { requestApi } from "@/lib/api-request";
import { ApiError } from "@/lib/api-client";
export const OG_CARD_SECONDS = 3600;
type OgApi = ReturnType<typeof requestApi> & {
  optional: <T>(path: string) => Promise<T | null>;
};
export async function cachedCardData<T>(
  key: readonly string[],
  read: (api: OgApi) => Promise<T>,
): Promise<T> {
  // Resolve the origin before entering the cache; shared cards never carry a session.
  const origin = await serverApiOrigin();
  const client = requestApi(origin);
  const api: OgApi = {
    ...client,
    async optional<T>(path: string) {
      try {
        return await client.get<T>(path);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  };
  return unstable_cache(() => read(api), ["og-api", origin, ...key], {
    revalidate: OG_CARD_SECONDS,
  })();
}
