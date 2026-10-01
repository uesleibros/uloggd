import "server-only";
import type { PoolClient } from "pg";
import type { ListFolder } from "@/lib/lists-types";

/** Folder names and counts are read under the same policies as their lists. */
export async function readListFolders(client: PoolClient, profileId: string) {
  const { rows } = await client.query<{
    data: ListFolder[];
    unfiled: number;
  }>(
    `with counted as (
       select f.id, f.public_id, f.name, f.position, f.created_at,
              count(l.id)::int as lists
         from public.list_folders f
         left join public.list_folder_items i on i.folder_id = f.id
         left join public.game_lists l on l.id = i.list_id
        where f.profile_id = $1
        group by f.id
     )
     select coalesce((select jsonb_agg(counted order by position, created_at)
                        from counted),
                     '[]'::jsonb) as data,
            (select count(*)::int from public.game_lists l
              where l.profile_id = $1
                and not exists (select 1 from public.list_folder_items i
                                 where i.list_id = l.id)) as unfiled`,
    [profileId],
  );
  return rows[0];
}
