import {
  jsonBody,
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COPY = `id, igdb_id, game_slug, platform_id, platform_name, storefront,
  ownership, medium, edition, region, note, acquired_on, created_at, updated_at`;

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
    const asked = new URL(request.url).searchParams.get("game");
    const game = asked === null ? null : Number(asked);
    return db(async (client) => {
      const { rows } = await client.query(
        `select ${COPY} from public.own_library_entries(game_id => $1)`,
        [Number.isSafeInteger(game) && game! > 0 ? game : null],
      );
      return { data: rows };
    });
  },
});

/**
 * Records a copy, or changes one.
 *
 * Every field but the game is optional: "I played it on PS5" is a row with a
 * platform and everything else null, which is what keeps this from being a
 * form. Sending `id` edits that copy instead of making another.
 */
export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const parameters = [
      requireInt(body, "igdb_id"),
      requireSlug(body, "game_slug"),
      optionalUuid(body, "id"),
      optionalInt(body, "platform_id", 1, 2147483647),
      optionalText(body, "platform_name", 120),
      optionalOneOf(body, "storefront", STOREFRONTS),
      optionalOneOf(body, "ownership", OWNERSHIPS),
      optionalOneOf(body, "medium", MEDIUMS),
      optionalText(body, "edition", 120),
      optionalText(body, "region", 60),
      optionalText(body, "note", 300),
      optionalDate(body, "acquired_on"),
    ];
    const data = await db(async (client) => {
      const { rows } = await client.query(
        `select ${COPY} from public.save_library_entry(
           game_id => $1, game_slug => $2, entry => $3,
           platform => $4, platform_label => $5,
           entry_storefront => $6, entry_ownership => $7,
           entry_medium => $8, entry_edition => $9, entry_region => $10,
           entry_note => $11, acquired => $12)`,
        parameters,
      );
      return rows[0];
    });
    return { data };
  },
});
