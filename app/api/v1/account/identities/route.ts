import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The providers this account can sign in with. */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ db }) => {
    const identities = await db(async (client) => {
      const { rows } = await client.query(
        "select * from public.list_own_identities()",
      );
      return rows;
    });
    return { data: identities };
  },
});
