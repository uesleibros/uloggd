import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

config({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const [profiles, policies] = await Promise.all([
      prisma.profile.count(),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        select count(*) from pg_policies
        where schemaname = 'public'
          and tablename in ('profiles', 'user_games', 'reviews', 'game_lists', 'game_list_items', 'follows', 'blocks', 'reports')
      `,
    ]);
    console.log(
      `Prisma Client: connected (${profiles} profiles, ${policies[0].count} RLS policies)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Prisma check failed");
  process.exitCode = 1;
});
