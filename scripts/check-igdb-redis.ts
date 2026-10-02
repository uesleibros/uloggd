import { config } from "dotenv";
import { createClient } from "redis";
config({ path: ".env.local", quiet: true });

async function main() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
  const { catalogRedisOptions } = await import("../lib/catalog-redis-client");
  const client = createClient(catalogRedisOptions());
  client.on("error", () => {});
  const deadline = setTimeout(() => {
    if (client.isOpen) client.destroy();
  }, 4000);
  try {
    await client.connect();
    const [info, entries, charged, ttl] = await Promise.all([
      client.info("memory"),
      client.zCard("{uloggd:igdb:v1}:lru"),
      client.hGet("{uloggd:igdb:v1}:data", "__bytes"),
      client.pTTL("{uloggd:igdb:v1}:data"),
    ]);
    const fields = Object.fromEntries(
      info.split("\r\n").map((line) => line.split(":")),
    );
    console.log(
      JSON.stringify({
        entries,
        chargedBytes: Number(charged ?? 0),
        usedMemoryBytes: Number(fields.used_memory),
        residentMemoryBytes: Number(fields.used_memory_rss),
        providerMaxMemoryBytes: Number(fields.maxmemory),
        providerEvictionPolicy: fields.maxmemory_policy,
        namespaceTtlMs: ttl,
      }),
    );
  } finally {
    clearTimeout(deadline);
    if (client.isOpen) client.destroy();
  }
}
main().catch(() => {
  console.error(
    "Redis catalogue check failed. Check the URL, trusted certificate and network.",
  );
  process.exitCode = 1;
});
