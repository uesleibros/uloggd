import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  optionalUuid,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { MEDIUMS, OWNERSHIPS, STOREFRONTS } from "@/lib/api/enums";
import { apiRoute } from "@/lib/api/route";
import { getGamesByIds } from "@/lib/igdb";
import { publicGame } from "@/lib/api/shapes";
import { matchingCopy, type Copy } from "@/lib/library-copies";
import { COPY_COLUMNS } from "@/lib/api/copies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The copies somebody has of a game: what they own, or have access to.
 *
 * Separate from the library, which says where a game stands with you, and
 * from a run, which says what happened when you played it. One game can have
 * three copies and two runs, and a run points at the copy it was played on.
 *
 * Their own only. Somebody else's copies are read through the journey they
 * belong to, by the rule their library visibility sets.
 */
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: ({ request, db }) => {
    const query = new URL(request.url).searchParams;
    const asked = query.get("game");
    const game = asked === null ? null : Number(asked);
    // `games=1` brings the catalogue rows along, for anything drawing copies
    // of more than one game: a view that asked per copy would be one request
    // per row of a shelf.
    const withGames = query.get("games") === "1";
    return db(async (client) => {
      const { rows } = await client.query<{ igdb_id: number }>(
        `select ${COPY_COLUMNS} from public.own_library_entries(game_id => $1)`,
        [Number.isSafeInteger(game) && game! > 0 ? game : null],
      );
      if (!withGames) return { data: rows };
      const games = await getGamesByIds(rows.map((row) => row.igdb_id));
      return { data: rows, games: games.map(publicGame) };
    });
  },
});

/**
 * Records a copy, or finds the one already recorded.
 *
 * Every field but the game is optional: "I played it on PS5" is a row with a
 * platform and everything else null, which is what keeps this from being a
 * form.
 *
 * It is an upsert rather than a create, because the common caller is somebody
 * saying how they played rather than cataloguing a shelf. Asking for "PS5"
 * when a PS5 copy is already recorded means that copy; answering with a new
 * row every time is how a library ends up with nine identical PlayStation 5
 * entries nobody asked for. `created` in the answer says which happened.
 *
 * Two escapes, because people do own two physical copies of one game:
 * `duplicate: true` always makes another, and `id` edits the one named.
 */
export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const id = optionalUuid(body, "id");
    const draft = {
      platform_id: optionalInt(body, "platform_id", 1, 2147483647),
      platform_name: optionalText(body, "platform_name", 120),
      storefront: optionalOneOf(body, "storefront", STOREFRONTS),
      ownership: optionalOneOf(body, "ownership", OWNERSHIPS),
      medium: optionalOneOf(body, "medium", MEDIUMS),
      edition: optionalText(body, "edition", 120),
      region: optionalText(body, "region", 60),
    };
    const note = optionalText(body, "note", 300);
    const acquired = optionalDate(body, "acquired_on");
    const duplicate = optionalBool(body, "duplicate") ?? false;

    return await db(async (client) => {
      if (!id && !duplicate) {
        const { rows: mine } = await client.query<Copy>(
          `select ${COPY_COLUMNS} from public.own_library_entries(game_id => $1)`,
          [gameId],
        );
        const already = matchingCopy(mine, draft);
        if (already) return { data: already, created: false };
      }

      const { rows } = await client.query(
        `select ${COPY_COLUMNS} from public.save_library_entry(
           game_id => $1, game_slug => $2, entry => $3,
           platform => $4, platform_label => $5,
           entry_storefront => $6, entry_ownership => $7,
           entry_medium => $8, entry_edition => $9, entry_region => $10,
           entry_note => $11, acquired => $12)`,
        [
          gameId,
          slug,
          id,
          draft.platform_id,
          draft.platform_name,
          draft.storefront,
          draft.ownership,
          draft.medium,
          draft.edition,
          draft.region,
          note,
          acquired,
        ],
      );
      return { data: rows[0], created: !id };
    });
  },
});
