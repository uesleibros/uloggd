import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DIRECT_URL is not configured");
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public._prisma_migrations (
        id varchar(36) primary key,
        checksum varchar(64) not null,
        finished_at timestamptz,
        migration_name varchar(255) not null,
        logs text,
        rolled_back_at timestamptz,
        started_at timestamptz not null default now(),
        applied_steps_count integer not null default 0
      )
    `);
    await client.query("select pg_advisory_lock(72707369)");
    const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
    const directories = (await readdir(migrationsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const migrationName of directories) {
      const existing = await client.query(
        "select 1 from public._prisma_migrations where migration_name = $1 and finished_at is not null and rolled_back_at is null",
        [migrationName],
      );
      if (existing.rowCount) {
        console.log(`${migrationName}: already applied`);
        continue;
      }

      const sql = await readFile(
        path.join(migrationsRoot, migrationName, "migration.sql"),
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into public._prisma_migrations
            (id, checksum, finished_at, migration_name, applied_steps_count)
           values ($1, $2, now(), $3, 1)`,
          [randomUUID(), checksum, migrationName],
        );
        await client.query("commit");
        console.log(`${migrationName}: applied`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client
      .query("select pg_advisory_unlock(72707369)")
      .catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration failed");
  process.exitCode = 1;
});
