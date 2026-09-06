import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the account has written, in one document.
 *
 * Session-only, and not because the export is secret — it is the person's own
 * data. It is because one call returns all of it: a key that could ask for
 * this would be a key that is one leak away from the whole account, which is
 * not what anybody hands an integration a key to do.
 */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ db }) => {
    const everything = await db(async (client) => {
      const { rows } = await client.query<{ export: unknown }>(
        "select public.export_account_data() as export",
      );
      return rows[0]?.export ?? null;
    });
    return { data: everything };
  },
});
