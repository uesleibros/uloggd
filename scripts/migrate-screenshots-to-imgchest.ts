import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

/**
 * Moves screenshots that still live in Supabase storage over to imgchest.
 *
 * Every new upload already goes to imgchest; this is only for rows written
 * before that change. Reads handle both pointers in the meantime, so running
 * this is not urgent, and not running it is not an outage.
 *
 * Safe to run more than once: it only touches rows with no `image_url` yet, and
 * a row is updated only after its image is confirmed uploaded. A failure leaves
 * that row exactly as it was, still readable from the bucket.
 *
 * Needs `IMGCHEST_API_KEY`, which lives with the deployment rather than in the
 * repository, so this is meant to be run wherever that key is available:
 *
 *   IMGCHEST_API_KEY=... npm run screenshots:migrate
 */
config({ path: ".env.local", quiet: true });

const apiKey = process.env.IMGCHEST_API_KEY;
const databaseUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !databaseUrl || !supabaseUrl || !serviceKey) {
  console.error(
    "Missing configuration. Needs IMGCHEST_API_KEY, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL and a service key.",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = new Client({ connectionString: databaseUrl });
await db.connect();

const { rows } = await db.query<{ id: string; storage_path: string }>(
  `select id, storage_path
     from public.screenshots
    where image_url is null and storage_path is not null
    order by created_at`,
);

console.log(`${rows.length} screenshot(s) to migrate.`);
let migrated = 0;
const failures: string[] = [];

for (const row of rows) {
  try {
    const { data: signed } = await admin.storage
      .from("screenshots")
      .createSignedUrl(row.storage_path, 300);
    if (!signed?.signedUrl) throw new Error("could not sign the stored object");

    const download = await fetch(signed.signedUrl);
    if (!download.ok) throw new Error(`download returned ${download.status}`);
    const bytes = Buffer.from(await download.arrayBuffer());

    const form = new FormData();
    form.append(
      "images[]",
      new Blob([new Uint8Array(bytes)], { type: "image/webp" }),
      `shot-${row.id}.webp`,
    );
    form.append("privacy", "hidden");

    const upload = await fetch("https://api.imgchest.com/v1/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!upload.ok) throw new Error(`imgchest returned ${upload.status}`);

    const payload = (await upload.json()) as {
      data?: { id?: string; images?: Array<{ link?: string }> };
    };
    const url = payload.data?.images?.[0]?.link;
    if (!url) throw new Error("imgchest returned no link");

    // Written last, so an interrupted run never leaves a row pointing at an
    // image that was not confirmed uploaded.
    await db.query(
      `update public.screenshots set image_url = $1, remote_id = $2 where id = $3`,
      [url, payload.data?.id ?? null, row.id],
    );
    migrated += 1;
    console.log(`  ${row.id} -> ${url}`);
  } catch (error) {
    failures.push(`${row.id}: ${(error as Error).message}`);
  }
}

const [{ remaining }] = (
  await db.query<{ remaining: string }>(
    `select count(*)::text remaining from public.screenshots where image_url is null`,
  )
).rows;

console.log(`\nMigrated ${migrated}, ${failures.length} failed.`);
for (const failure of failures) console.log(`  ${failure}`);
console.log(`Still on storage: ${remaining}`);
if (remaining === "0")
  console.log(
    "\nEvery screenshot now has a URL. The storage bucket and the storage_path column can be retired.",
  );

await db.end();
