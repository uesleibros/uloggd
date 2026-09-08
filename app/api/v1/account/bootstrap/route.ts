import { apiRoute } from "@/lib/api/route";
import { jsonBody, optionalBool } from "@/lib/api/body";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const adopt =
      optionalBool(await jsonBody(request), "adopt_twitch") ?? false;
    return db(async (client) => {
      await client.query(
        "insert into public.profiles(id) values($1) on conflict(id) do nothing",
        [identity.profileId],
      );
      if (adopt) await client.query("select public.adopt_twitch_identity()");
      return {
        data: (
          await client.query(
            "select username from public.profiles where id=$1",
            [identity.profileId],
          )
        ).rows[0],
      };
    });
  },
});
