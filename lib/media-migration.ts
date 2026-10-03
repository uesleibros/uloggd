import { LEGACY_MEDIA_URL } from "./media-url";
export type LegacyMediaReference = {
  table: string;
  column: string;
  id: string;
  owner: string;
  kind: "avatar" | "banner" | "screenshot" | "journal";
  value: string;
};
export function groupLegacyMedia(rows: LegacyMediaReference[]) {
  const groups = new Map<string, LegacyMediaReference[]>();
  for (const row of rows) {
    if (!LEGACY_MEDIA_URL.test(row.value)) continue;
    const key = `${row.owner}:${row.kind}:${row.value}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()];
}
export async function migrateMediaGroup<T>(
  references: LegacyMediaReference[],
  {
    dryRun,
    find,
    upload,
    verify,
    remember,
    update,
    rollback,
  }: {
    dryRun: boolean;
    find: () => Promise<T | null>;
    upload: () => Promise<T>;
    verify: (value: T) => Promise<void>;
    remember: (value: T) => Promise<void>;
    update: (reference: LegacyMediaReference, value: T) => Promise<void>;
    rollback?: (value: T) => Promise<void>;
  },
) {
  if (dryRun) return { references: references.length, uploaded: false };
  const existing = await find();
  const stored = existing ?? (await upload());
  try {
    await verify(stored);
    if (!existing) await remember(stored);
  } catch (error) {
    if (!existing && rollback) await rollback(stored);
    throw error;
  }
  for (const reference of references) await update(reference, stored);
  return { references: references.length, uploaded: !existing };
}
