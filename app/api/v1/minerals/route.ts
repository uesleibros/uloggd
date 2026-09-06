import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The wallet: what has been earned, and what has changed hands.
 *
 * The grants policy is `using (true)` — a wallet is public the way a level is
 * — so the profile clause here is the scoping, not the index hint it looks
 * like. The transfers are the owner's own and stay that way.
 */
export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ identity, db }) => {
    return await db(async (client) => {
      const { rows: grants } = await client.query(
        `select level, mineral, created_at
           from public.mineral_grants
          where profile_id = $1
          order by level desc`,
        [identity.profileId],
      );

      const { rows: transfers } = await client.query(
        `select move.id, move.sender_id, move.recipient_id, move.note,
                move.created_at,
                sender.username as sender_username,
                sender.display_name as sender_display_name,
                recipient.username as recipient_username,
                recipient.display_name as recipient_display_name,
                coalesce(
                  (select json_agg(json_build_object(
                            'mineral', item.mineral, 'amount', item.amount))
                     from public.mineral_transfer_items item
                    where item.transfer_id = move.id),
                  '[]'::json) as items
           from public.mineral_transfers move
           join public.profiles sender on sender.id = move.sender_id
           join public.profiles recipient on recipient.id = move.recipient_id
          where move.sender_id = $1 or move.recipient_id = $1
          order by move.created_at desc
          limit 50`,
        [identity.profileId],
      );

      return { data: { grants, transfers } };
    });
  },
});

/**
 * Collecting what a level owes.
 *
 * Idempotent by construction: the grant rows are keyed on the profile and the
 * level, so asking twice inserts nothing the second time and answers with an
 * empty list. Nothing owed is the common case and says nothing at all.
 */
export const POST = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ db }) => {
    const claimed = await db(async (client) => {
      const { rows } = await client.query(
        "select level, mineral from public.claim_level_minerals()",
      );
      return rows;
    });
    return { data: claimed };
  },
});
