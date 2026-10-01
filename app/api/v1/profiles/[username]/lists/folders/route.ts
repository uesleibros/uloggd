import { apiRoute } from "@/lib/api/route";
import { readProfile } from "@/lib/api/profile-read";
import { readListFolders } from "@/lib/api/list-folder-read";
import { segmentBefore, HANDLE } from "@/lib/api/path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: ({ request, db }) =>
    db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 2, "username", HANDLE),
      );
      return readListFolders(client, profile.id);
    }),
});
