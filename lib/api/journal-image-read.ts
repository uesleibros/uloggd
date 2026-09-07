import "server-only";
import type { PoolClient } from "pg";
import type { JournalImage } from "@/lib/journal-images";

export async function readJournalImages(
  client: PoolClient,
  ids: string[],
): Promise<Record<string, JournalImage[]>> {
  if (!ids.length) return {};
  const { rows } = await client.query(
    "select id,entry_id,image_url,width,height,caption from public.diary_entry_images where entry_id=any($1::uuid[]) order by position",
    [[...new Set(ids)]],
  );
  const result: Record<string, JournalImage[]> = {};
  for (const row of rows)
    (result[row.entry_id] ??= []).push({
      id: row.id,
      url: row.image_url,
      width: row.width,
      height: row.height,
      caption: row.caption,
    });
  return result;
}
