import { jsonBody, optionalInt, optionalText } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { readListFolders } from "@/lib/api/list-folder-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The caller's folders, with how many lists are in each.
 *
 * A folder is a heading and nothing else: it carries no visibility of its own,
 * so filing a private list does not publish it and filing a public one does
 * not hide it. Two privacy controls on one object is how people publish things
 * by accident.
 *
 * The counts are over the lists the reader may see, which for the owner is all
 * of them and for visitors follows the existing visibility rules. A folder holding nothing
 * they can see is not in their answer at all, because the names people give
 * their folders are not nothing.
 */
export const GET = apiRoute({
  scope: "lists.read",
  bucket: "read",
  handle: ({ identity, db }) =>
    db((client) => readListFolders(client, identity.profileId)),
});

/**
 * Makes a folder.
 *
 * A plain insert rather than a function: the only rule is the name, and the
 * table carries it as a constraint, so a function here would be a second copy
 * of one check.
 */
export const POST = apiRoute({
  scope: "lists.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const name = (optionalText(body, "name", 60) ?? "").trim();
    if (!name) throw new ApiFailure("invalid_request", "name is required.");
    const position = optionalInt(body, "position", 0, 999) ?? 0;

    return await db(async (client) => {
      const { rows } = await client.query(
        `insert into public.list_folders (profile_id, name, position)
         values ($1, $2, $3)
         on conflict (profile_id, name) do nothing
         returning id, public_id, name, position, created_at`,
        [identity.profileId, name, position],
      );
      // A name somebody already used is not an error worth a stack trace: it
      // is the folder they meant, so it is answered with.
      if (!rows[0]) {
        const { rows: already } = await client.query(
          `select id, public_id, name, position, created_at
             from public.list_folders
            where profile_id = $1 and name = $2`,
          [identity.profileId, name],
        );
        if (!already[0])
          throw new ApiFailure("conflict", "That folder could not be made.");
        return { data: already[0], created: false };
      }
      return { data: rows[0], created: true };
    });
  },
});
