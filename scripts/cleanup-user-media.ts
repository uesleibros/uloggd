import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { drainMediaCleanup } from "../lib/media-cleanup";
void drainMediaCleanup().catch(() => {
  console.error("media.delete.failed", {
    message: "cleanup queue unavailable",
  });
  process.exitCode = 1;
});
