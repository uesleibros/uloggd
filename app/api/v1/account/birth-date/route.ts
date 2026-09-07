import { jsonBody, optionalDate } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The caller's own age data.
 *
 * There was a way to set it and no way to read it back, which is a gap the
 * site itself could not live with: two onboarding screens have to know whether
 * this step is done. The columns are revoked from `authenticated`, so the
 * definer function is the only way in, for the API as much as for anyone.
 */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ db }) => {
    const own = await db(async (client) => {
      const { rows } = await client.query<{
        birth_date: string | null;
        age_assured_at: string | null;
        age_assurance_method: string | null;
      }>("select * from public.own_age_profile()");
      return rows[0] ?? null;
    });
    return {
      data: own ?? {
        birth_date: null,
        age_assured_at: null,
        age_assurance_method: null,
      },
    };
  },
});

export const PUT = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const born = optionalDate(await jsonBody(request), "birth_date");
    if (!born)
      throw new ApiFailure("invalid_request", "birth_date is required.");

    // The age rule is the database's, and it raises rather than returning a
    // date that is too recent, so there is nothing to check twice here.
    const saved = await db(async (client) => {
      const { rows } = await client.query<{ born: string }>(
        "select public.set_birth_date(candidate => $1) as born",
        [born],
      );
      return rows[0]?.born ?? null;
    });
    return { data: { birth_date: saved } };
  },
});
