import { jsonBody, optionalDate } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
