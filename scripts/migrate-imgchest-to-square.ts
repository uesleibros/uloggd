import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { createAdminClient } from "../lib/supabase/admin";
import { downloadUserMedia } from "../lib/media-download";
import { processUserImage } from "../lib/user-image";
import { uploadImage, verifyStoredImage } from "../lib/square-blob";
import { rollbackMedia } from "../lib/media-cleanup";
import {
  groupLegacyMedia,
  migrateMediaGroup,
  type LegacyMediaReference,
} from "../lib/media-migration";

async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) => args[args.indexOf(name) + 1];
  const dryRun = args.includes("--dry-run");
  const limit = args.includes("--limit") ? Number(option("--limit")) : Infinity;
  const kind = args.includes("--type") ? option("--type") : null;
  if (
    !(limit > 0) ||
    (kind && !["avatar", "banner", "screenshot", "journal"].includes(kind))
  )
    throw new Error("invalid migration options");
  const db = createAdminClient();
  let owner: string | null = null;
  if (args.includes("--user")) {
    const { data, error } = await db
      .from("profiles")
      .select("id")
      .eq("username", option("--user").replace(/^@/, ""))
      .single();
    if (error || !data) throw new Error("migration user not found");
    owner = data.id;
  }
  const references: LegacyMediaReference[] = [];
  for (const table of [
    "profiles",
    "profile_image_history",
    "screenshots",
    "diary_entry_images",
  ]) {
    const columns =
      table === "profiles"
        ? "id,avatar_url,banner_url"
        : table === "profile_image_history"
          ? "id,profile_id,kind,image_url"
          : "id,profile_id,image_url";
    for (let offset = 0; ; offset += 100) {
      let query = db
        .from(table)
        .select(columns)
        .order("id")
        .range(offset, offset + 99);
      if (owner)
        query = query.eq(table === "profiles" ? "id" : "profile_id", owner);
      const { data, error } = await query;
      if (error) throw new Error(`could not read ${table}`);
      for (const row of data ?? []) {
        const r = row as unknown as Record<string, string>;
        const kinds =
          table === "profiles"
            ? ["avatar", "banner"]
            : [
                table === "profile_image_history"
                  ? r.kind.toLowerCase()
                  : table === "screenshots"
                    ? "screenshot"
                    : "journal",
              ];
        for (const type of kinds) {
          const column = table === "profiles" ? `${type}_url` : "image_url";
          if ((!kind || kind === type) && r[column])
            references.push({
              table,
              column,
              id: r.id,
              owner: table === "profiles" ? r.id : r.profile_id,
              kind: type as LegacyMediaReference["kind"],
              value: r[column],
            });
        }
      }
      if ((data?.length ?? 0) < 100) break;
    }
  }
  const groups = groupLegacyMedia(references).slice(0, limit);
  let failures = 0;
  for (const refs of groups) {
    const first = refs[0];
    try {
      const result = await migrateMediaGroup(refs, {
        dryRun,
        find: async () => {
          const { data, error } = await db
            .from("media_migrations")
            .select("storage_key")
            .eq("profile_id", first.owner)
            .eq("kind", first.kind)
            .eq("legacy_url", first.value)
            .maybeSingle();
          if (error) throw new Error("migration ledger unavailable");
          return data?.storage_key ?? null;
        },
        upload: async () =>
          (
            await uploadImage(
              await processUserImage(
                await downloadUserMedia(first.value),
                first.kind,
              ),
              first.owner,
              first.kind,
            )
          ).key,
        verify: async (key) => {
          await verifyStoredImage(key);
        },
        rollback: (key) => rollbackMedia(key, first.owner),
        remember: async (key) => {
          const { error } = await db
            .from("media_migrations")
            .insert({
              profile_id: first.owner,
              kind: first.kind,
              legacy_url: first.value,
              storage_key: key,
            });
          if (error) throw new Error("migration ledger write failed");
        },
        update: async (ref, key) => {
          const { error } = await db
            .from(ref.table)
            .update({
              [ref.column]: key,
              ...(ref.table === "profiles" ? {} : { remote_id: null }),
            })
            .eq("id", ref.id)
            .eq(ref.column, ref.value);
          if (error) throw new Error(`migration update failed: ${ref.table}`);
        },
      });
      console.info("media.migration.success", {
        type: first.kind,
        profileId: first.owner,
        dryRun,
        ...result,
      });
    } catch (error) {
      failures++;
      console.error("media.migration.failed", {
        type: first.kind,
        profileId: first.owner,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  console.info("media.migration.summary", {
    dryRun,
    groups: groups.length,
    failures,
  });
  if (failures) process.exitCode = 1;
}
void main().catch(() => {
  console.error("media.migration.failed", {
    message: "migration could not start",
  });
  process.exitCode = 1;
});
