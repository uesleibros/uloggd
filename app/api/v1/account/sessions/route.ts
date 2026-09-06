import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where the account is signed in, and on what. */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ db }) => {
    const sessions = await db(async (client) => {
      const { rows } = await client.query(
        "select * from public.list_own_sessions()",
      );
      return rows;
    });
    return { data: sessions };
  },
});
