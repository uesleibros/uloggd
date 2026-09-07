import "server-only";
import { cache } from "react";
import { serverApi, settleServer } from "@/lib/api-server";
import type { ProfileResponse } from "@/lib/profile-types";

// Metadata and the page share one read within this request, never across viewers.
export const getPublicProfile = cache(async (username: string) => {
  const { data } = await settleServer(
    serverApi.get<ProfileResponse>(`/profiles/${encodeURIComponent(username)}`),
  );
  return data;
});
