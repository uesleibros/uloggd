import {
  jsonBody,
  optionalOneOf,
  optionalUuid,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { VISIBILITIES } from "@/lib/api/enums";
import { apiRoute } from "@/lib/api/route";
import { getGamesByIds } from "@/lib/igdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COLUMNS =
  "id, public_id, igdb_id, game_slug, played_on, visibility, journey_id, note, minutes, open_since, created_at, updated_at";

/**
 * The one session the caller has open, if they have one.
 *
 * Answers `null` rather than 404, because "nothing is open" is the ordinary
 * state of this resource and not a missing thing. It comes with its events,
 * since every caller that wants the session wants what is in it: asking twice
 * would make the persistent bar two requests on every page.
 */
export const GET = apiRoute({
  scope: "journal.read",
  bucket: "read",
  handle: ({ db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `select ${SESSION_COLUMNS} from public.own_play_session()`,
      );
      if (!rows[0]) return { data: null };
      const events = await client.query(
        `select id, kind, body, marker, screenshot_id, at
           from public.own_play_events()`,
      );
      // The game comes along, because every caller that shows an open session
      // shows what it is a session of, and a bar that has to ask twice is a
      // bar that appears in two steps.
      const [game] = await getGamesByIds([rows[0].igdb_id as number]);
      return {
        data: {
          ...rows[0],
          events: events.rows,
          game: game
            ? {
                id: game.id,
                slug: game.slug,
                name: game.name,
                cover_url: game.coverUrl,
              }
            : null,
        },
      };
    }),
});

/** Opens one. 55006 when one is already open, which the caller offers instead. */
export const POST = apiRoute({
  scope: "journal.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const parameters = [
      requireInt(body, "igdb_id"),
      requireSlug(body, "game_slug"),
      optionalUuid(body, "journey_id"),
      optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
    ];
    const data = await db(async (client) => {
      const { rows } = await client.query(
        `select ${SESSION_COLUMNS} from public.open_play_session(
           game_id => $1, game_slug => $2, journey => $3,
           session_visibility => $4::public."Visibility")`,
        parameters,
      );
      return rows[0];
    });
    const [game] = await getGamesByIds([parameters[0] as number]);
    return {
      data: {
        ...data,
        events: [],
        game: game
          ? {
              id: game.id,
              slug: game.slug,
              name: game.name,
              cover_url: game.coverUrl,
            }
          : null,
      },
    };
  },
});
