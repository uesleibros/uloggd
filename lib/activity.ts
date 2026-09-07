import "server-only";
import { serverApi } from "@/lib/api-server";
import type { ActivityOptions } from "@/lib/activity-types";
import type { SocialEntry } from "@/components/social/activity-stream";

export async function getActivity(
  options: ActivityOptions = {},
): Promise<SocialEntry[]> {
  if (options.profileIds && !options.profileIds.length) return [];
  const query = new URLSearchParams();
  const values = {
    profile: options.profileId,
    profiles: options.profileIds?.join(","),
    game: options.gameId,
    limit: options.limit,
    before: options.before,
    kinds: options.kinds?.join(","),
    rating: options.rating,
    spoilers: options.spoilers,
    order: options.order,
    q: options.search,
    offset: options.offset,
  };
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) query.set(key, String(value));
  return (await serverApi.get<{ data: SocialEntry[] }>(`/activity?${query}`))
    .data;
}
