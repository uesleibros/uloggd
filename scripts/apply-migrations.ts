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
    await client.query("create schema if not exists supabase_migrations");
    await client.query(`
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        statements text[],
        name text
      )
    `);
    await client.query(`
      do $$
      begin
        if to_regclass('public._prisma_migrations') is not null then
          insert into supabase_migrations.schema_migrations (version, name)
          select split_part(migration_name, '_', 1), migration_name
          from public._prisma_migrations
          where finished_at is not null and rolled_back_at is null
          on conflict (version) do nothing;
        end if;
      end $$
    `);
    await client.query("select pg_advisory_lock(72707369)");
    const migrationsRoot = path.join(process.cwd(), "supabase", "migrations");
    const migrations = (await readdir(migrationsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    for (const migrationFile of migrations) {
      const version = migrationFile.split("_", 1)[0];
      const migrationName = migrationFile.replace(/\.sql$/, "");
      const existing = await client.query(
        "select 1 from supabase_migrations.schema_migrations where version = $1",
        [version],
      );
      if (existing.rowCount) {
        console.log(`${migrationName}: already applied`);
        continue;
      }

      const sql = await readFile(
        path.join(migrationsRoot, migrationFile),
        "utf8",
      );
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into supabase_migrations.schema_migrations (version, name, statements)
           values ($1, $2, $3)`,
          [version, migrationName, [sql]],
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
