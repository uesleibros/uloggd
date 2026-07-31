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
 * Signed, ordered images for a set of journal entries.
 *
 * Journal images share the private screenshots bucket, so reading one always
 * costs a signing round trip. Batching by entry keeps that to a single call per
 * page instead of one per session in a timeline.
 */
export async function getJournalImages(
  supabase: SupabaseClient,
  entryIds: string[],
): Promise<Map<string, JournalImage[]>> {
  const ids = [...new Set(entryIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from("diary_entry_images")
    .select("id,entry_id,storage_path,caption,width,height,position")
    .in("entry_id", ids)
    .order("position", { ascending: true })
    .limit(ids.length * JOURNAL_IMAGE_LIMIT);
  const rows = data ?? [];
  if (!rows.length) return new Map();

  const { data: signed } = await supabase.storage
    .from("screenshots")
    .createSignedUrls(
      rows.map((row) => String(row.storage_path)),
      3600,
    );
  const urlByPath = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl]),
  );

  const byEntry = new Map<string, JournalImage[]>();
  for (const row of rows) {
    const url = urlByPath.get(String(row.storage_path));
    if (!url) continue;
    const entryId = String(row.entry_id);
    const list = byEntry.get(entryId) ?? [];
    list.push({
      id: String(row.id),
      url,
      width: Number(row.width),
      height: Number(row.height),
      caption: row.caption ? String(row.caption) : null,
    });
    byEntry.set(entryId, list);
  }
  return byEntry;
}
