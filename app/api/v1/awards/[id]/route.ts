import { apiRoute, ApiFailure } from "@/lib/api/route";
import { jsonBody, requireInt } from "@/lib/api/body";
import {
  awardBody,
  awardKey,
  checkAwardGames,
  readAward,
} from "@/lib/api/awards";
import { awardGameIds } from "@/lib/awards";
import { getGamesByIds } from "@/lib/igdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const answer = await db((client) =>
      readAward(client, awardKey(request), identity?.profileId ?? null),
    );
    const games = await getGamesByIds(awardGameIds(answer.data.categories));
    return {
      ...answer,
      games: games.map(({ id, name, slug, coverUrl }) => ({
        id,
        name,
        slug,
        coverUrl,
      })),
    };
  },
});

export const PATCH = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const doc = awardBody(body);
    const version = requireInt(body, "version");
    await checkAwardGames(doc.categories);
    const key = awardKey(request);
    return db(async (client) => {
      const { rows } = await client.query(
        `update public.game_awards set name=$3,year=$4,mode=$5,rules=$6,source=$7,source_list_id=$8,visibility=$9::public."Visibility",status=$10,categories=$11::jsonb
       where ${key[0]}=$1 and profile_id=$2 and version=$12 returning *`,
        [
          key[1],
          identity.profileId,
          doc.name,
          doc.year,
          doc.mode,
          doc.rules,
          doc.source,
          doc.source_list_id,
          doc.visibility,
          doc.status,
          JSON.stringify(doc.categories),
          version,
        ],
      );
      if (!rows[0]) {
        const { rows: before } = await client.query(
          `select id from public.game_awards where ${key[0]}=$1 and profile_id=$2`,
          [key[1], identity.profileId],
        );
        throw new ApiFailure(
          before.length ? "conflict" : "not_found",
          before.length
            ? "This award changed elsewhere. Reload before saving."
            : "No award of yours with that id.",
        );
      }
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const key = awardKey(request);
    return db(async (client) => {
      const result = await client.query(
        `delete from public.game_awards where ${key[0]}=$1 and profile_id=$2 returning id`,
        [key[1], identity.profileId],
      );
      if (!result.rowCount)
        throw new ApiFailure("not_found", "No award of yours with that id.");
      return { data: { deleted: true } };
    });
  },
});
