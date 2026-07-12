import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

async function check(name: "DATABASE_URL" | "DIRECT_URL") {
  const connectionString = process.env[name];
  if (!connectionString) throw new Error(`${name} is not configured`);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    const result = await client.query<{ database: string; schema: string }>(
      "select current_database() as database, current_schema() as schema",
    );
    const { database, schema } = result.rows[0];
    console.log(`${name}: connected to ${database}.${schema}`);
  } finally {
    await client.end();
  }
}

async function main() {
  await check("DATABASE_URL");
  await check("DIRECT_URL");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Database check failed",
  );
  process.exitCode = 1;
});
