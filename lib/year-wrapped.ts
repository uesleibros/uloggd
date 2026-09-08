import "server-only";
import { cachedCardData } from "@/lib/og-data";
import type { ProfileResponse, ProfileYear } from "@/lib/profile-types";

export const MIN_WRAPPED_YEAR = 2000;

export function parseWrappedYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  const current = new Date().getUTCFullYear();
  return year >= MIN_WRAPPED_YEAR && year <= current ? year : null;
}

export async function getYearShareSummary(username: string, year: number) {
  return cachedCardData(["year", username, String(year)], async (api) => {
    const [profileResponse, yearResponse] = await Promise.all([
      api.optional<ProfileResponse>(
        `/profiles/${encodeURIComponent(username)}`,
      ),
      api.optional<ProfileYear>(
        `/profiles/${encodeURIComponent(username)}/year/${year}`,
      ),
    ]);
    if (!profileResponse || !yearResponse) return null;
    const rows = yearResponse.data.sessions;
    return {
      profile: profileResponse.data,
      sessions: rows.length,
      games: new Set(rows.map((row) => row.igdb_id)).size,
      minutes: rows.reduce((sum, row) => sum + (row.minutes ?? 0), 0),
      reviews: yearResponse.data.reviews.length,
    };
  });
}
