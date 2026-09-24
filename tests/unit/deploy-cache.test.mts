import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The data cache is held in memory, and the deploy can find the thing that
 * holds it.
 *
 * Next writes every cached fetch to `.next/cache/fetch-cache` as a file and
 * never removes one. The catalogue reads IGDB through `unstable_cache`, so the
 * number of entries is the number of distinct queries anybody has ever made:
 * the host ran out of container disk, and from then on every render failed
 * writing the next entry.
 *
 * Two halves have to agree for the replacement to work, and both fail
 * silently: the handler's path is recorded relative to the build directory in
 * the separators of whatever built it, and `..\\cache-handler.js` is not a path
 * on Linux, it is one filename with a backslash in it.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the cache handler keeps the data cache off the disk", async () => {
  const config = await read("next.config.ts");
  assert.match(
    config,
    /cacheHandler: fileURLToPath\(new URL\("\.\/cache-handler\.js"/,
  );
  // Next's own in-memory copy would be a second one beside the handler's.
  assert.match(config, /cacheMaxMemorySize: 0/);

  const handler = await read("cache-handler.js");
  // A ceiling and an eviction order, or it trades a full disk for a full heap.
  assert.match(handler, /MAX_BYTES/);
  assert.match(handler, /evictWhileOver/);
  assert.doesNotMatch(handler, /require\(["']node:fs["']\)/);
});

test("the deploy ships the handler and can resolve it", async () => {
  const script = await read("scripts/package-square.sh");
  assert.match(script, /cp "\$\{root\}\/cache-handler\.js"/);
  // The recorded path is rewritten with forward slashes, since the build runs
  // on Windows and the server does not.
  assert.match(script, /cacheHandler = "\.\.\/cache-handler\.js"/);
  assert.match(script, /required-server-files\.json/);

  // And whatever an older deploy left behind is removed before the workers
  // start, which is what frees a container that already filled up.
  const server = await read("server.js");
  assert.match(server, /rmSync\(/);
  assert.match(server, /"\.next", "standalone", "\.next", "cache"/);
});
