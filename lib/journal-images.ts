import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JOURNAL_IMAGE_LIMIT } from "@/lib/journal-entry";

export type JournalImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
};

/**
 * Ordered images for a set of journal entries.
 *
 * Images live on imgchest, the same host as avatars and banners, so the URL is
 * already final, no signing round trip. RLS on `diary_entry_images` still
 * decides which rows come back, which is what keeps a private entry's gallery
 * out of someone else's page.
 */
export async function getJournalImages(
  supabase: SupabaseClient,
  entryIds: string[],
): Promise<Map<string, JournalImage[]>> {
  const ids = [...new Set(entryIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from("diary_entry_images")
    .select("id,entry_id,image_url,caption,width,height,position")
    .in("entry_id", ids)
    .order("position", { ascending: true })
    .limit(ids.length * JOURNAL_IMAGE_LIMIT);

  const byEntry = new Map<string, JournalImage[]>();
  for (const row of data ?? []) {
    const entryId = String(row.entry_id);
    const list = byEntry.get(entryId) ?? [];
    list.push({
      id: String(row.id),
      url: String(row.image_url),
      width: Number(row.width),
      height: Number(row.height),
      caption: row.caption ? String(row.caption) : null,
    });
    byEntry.set(entryId, list);
  }
  return byEntry;
}
