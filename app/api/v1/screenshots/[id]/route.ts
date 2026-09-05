import { removeImage } from "@/lib/imgchest";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiRoute({
  scope: "screenshots.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "screenshot id", UUID);

    // The row goes first. If the image host is unreachable the picture is
    // orphaned there, which is a file nobody can reach; the other order leaves
    // a row pointing at nothing, which is a broken picture on a page.
    const removed = await db(async (client) => {
      const { rows } = await client.query<{ remote_id: string | null }>(
        "delete from public.screenshots where id = $1 returning remote_id",
        [id],
      );
      // Whether a row went is `rows.length`, not whether it carried a remote
      // id: a row with none is still a row, and reading the id as the answer
      // would report a successful delete as a miss.
      return { found: rows.length > 0, remote: rows[0]?.remote_id ?? null };
    });

    if (!removed.found)
      throw new ApiFailure("not_found", "No screenshot of yours with that id.");

    if (removed.remote) await removeImage(removed.remote, "screenshots");
    return { data: { id, deleted: true } };
  },
});
