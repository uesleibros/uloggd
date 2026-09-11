import "server-only";
import { unstable_cache } from "next/cache";
import { apiReader, serverApiOrigins } from "@/lib/api-server";
import { ApiError } from "@/lib/api-client";

export const OG_CARD_SECONDS = 3600;

type OgApi = ReturnType<typeof apiReader> & {
  optional: <T>(path: string) => Promise<T | null>;
};

export async function cachedCardData<T>(
  key: readonly string[],
  read: (api: OgApi) => Promise<T>,
): Promise<T> {
  // The addresses are resolved out here because reading them reads the request,
  // and `unstable_cache` forbids the dynamic APIs inside it. This used to take
  // only the first address and fetch it directly, which meant the one caller
  // that crawlers hit hardest was also the one with no fallback and with
  // redirects followed. That is how the TLS error survived its own fix.
  const origins = await serverApiOrigins();
  const client = apiReader(origins);

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

  // The address is not part of the key: every candidate is this same process,
  // so which one answered says nothing about the answer.
  return unstable_cache(() => read(api), ["og-api", ...key], {
    revalidate: OG_CARD_SECONDS,
  })();
}
