import "server-only";
import { after } from "next/server";
import { createAdminClient } from "./supabase/admin";
import { removeImage } from "./square-blob";
import { ownsMedia } from "./media-url";

let flight: Promise<void> | undefined;
/** Failed deletes remain in the database queue, including cascaded account/content deletes. */
export function drainMediaCleanup() {
  return (flight ??= (async () => {
    const db = createAdminClient();
    const { data } = await db
      .from("media_delete_queue")
      .select("storage_key,profile_id")
      .order("created_at")
      .limit(16);
    for (const row of data ?? []) {
      const { data: referenced, error } = await db.rpc("media_is_referenced", {
        key: row.storage_key,
      });
      if (error) continue;
      try {
        if (!referenced) await removeImage(row.storage_key, row.profile_id);
        await db
          .from("media_delete_queue")
          .delete()
          .eq("storage_key", row.storage_key);
      } catch {
        /* Retry on a later mutation or maintenance run. */
      }
    }
  })().finally(() => {
    flight = undefined;
  }));
}
export function scheduleMediaCleanup() {
  after(() => drainMediaCleanup().catch(() => {}));
}
/** Roll back an uncommitted upload; preserve a retry record if storage is unavailable. */
export async function rollbackMedia(key: string, owner: string) {
  if (!ownsMedia(key, owner)) throw new Error("invalid media owner");
  try {
    await removeImage(key, owner);
  } catch {
    const { error } = await createAdminClient()
      .from("media_delete_queue")
      .upsert(
        { storage_key: key, profile_id: owner },
        { onConflict: "storage_key" },
      );
    if (error) console.error("media.rollback.queue_failed", { key });
  }
}
