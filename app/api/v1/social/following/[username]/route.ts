import { HANDLE, lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolve(
  client: {
    query: (
      sql: string,
      values: unknown[],
    ) => Promise<{ rows: { id: string }[] }>;
  },
  username: string,
) {
  const { rows } = await client.query(
    "select id from public.profiles where lower(username) = lower($1) limit 1",
    [username],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No account with that name.");
  return rows[0].id;
}

export const PUT = apiRoute({
  scope: "social.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const username = lastSegment(request, "username", HANDLE);
    return await db(async (client) => {
      const target = await resolve(client, username);
      if (target === identity.profileId)
        throw new ApiFailure(
          "invalid_request",
          "An account cannot follow itself.",
        );
      await client.query(
        `insert into public.follows (follower_id, following_id)
         values ($1, $2)
         on conflict do nothing`,
        [identity.profileId, target],
      );
      const { rows } = await client.query(
        `select exists(
           select 1 from public.follows
            where follower_id = $1 and following_id = $2) as following`,
        [identity.profileId, target],
      );
      return { data: { username, following: rows[0]?.following ?? false } };
    });
  },
});

export const DELETE = apiRoute({
  scope: "social.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const username = lastSegment(request, "username", HANDLE);
    return await db(async (client) => {
      const target = await resolve(client, username);
      await client.query(
        "delete from public.follows where follower_id = $1 and following_id = $2",
        [identity.profileId, target],
      );
      return { data: { username, following: false } };
    });
  },
});
