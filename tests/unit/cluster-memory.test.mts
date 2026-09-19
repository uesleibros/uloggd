import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * The cluster fits inside the container it runs in.
 *
 * Square Cloud stops the whole container at 3072MB. The launcher started three
 * workers and told none of them how much room there was, so each sized its
 * heap from the machine (4288MB each, measured) and three of them were allowed
 * twelve gigabytes between them. V8 collects lazily far from its limit, so the
 * site did not fail, it drifted, until the platform ended every worker at once.
 */

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { memoryPlan } = require(path.join(ROOT, "server-memory.js")) as {
  memoryPlan: (options: { workers: number; env: Record<string, string> }) => {
    budgetMb: number;
    heapMb: number;
    rssLimitMb: number;
  };
};

test("three workers in 3GB leave room for a replacement and the primary", () => {
  const plan = memoryPlan({ workers: 3, env: { MEMORY_LIMIT_MB: "3072" } });
  assert.equal(plan.budgetMb, 3072);

  // The heaps together are half the budget, because a Next worker carries a
  // great deal outside its heap.
  assert.ok(plan.heapMb * 3 <= plan.budgetMb * 0.5 + 1);

  // Three workers at their recycling point, plus one replacement booting beside
  // them (~200MB) and the primary (~50MB), still under the container's limit.
  assert.ok(
    plan.rssLimitMb * 3 + 200 + 50 < plan.budgetMb,
    `3 x ${plan.rssLimitMb}MB + a replacement + the primary exceeds ${plan.budgetMb}MB`,
  );

  // Recycling below the heap ceiling would replace workers for doing nothing
  // wrong.
  assert.ok(plan.rssLimitMb > plan.heapMb);
});

test("the platform's own MEMORY setting is honoured when nothing is pinned", () => {
  const plan = memoryPlan({ workers: 3, env: { MEMORY: "3072" } });
  // On Linux the cgroup wins, which is right: it is what the kernel enforces.
  // Anywhere else, the platform's figure beats the size of the machine.
  if (process.platform !== "linux") assert.equal(plan.budgetMb, 3072);
});

test("each figure can be pinned, for a platform that counts differently", () => {
  const plan = memoryPlan({
    workers: 3,
    env: {
      MEMORY_LIMIT_MB: "3072",
      WORKER_HEAP_MB: "400",
      WORKER_RSS_LIMIT_MB: "700",
    },
  });
  assert.equal(plan.heapMb, 400);
  assert.equal(plan.rssLimitMb, 700);
});

test("the launcher applies the plan to every worker", async () => {
  const launcher = await readFile(path.join(ROOT, "server.js"), "utf8");
  assert.match(
    launcher,
    /--max-old-space-size=\$\{plan\.heapMb\}/,
    "workers must be told their heap ceiling, or each sizes it from the machine",
  );
  assert.match(
    launcher,
    /"--require",\s*guard/,
    "workers must report their size, or the primary cannot recycle them",
  );
  assert.match(
    launcher,
    /MALLOC_ARENA_MAX/,
    "glibc keeps freed memory per thread arena; workers must start with few of them",
  );
  // A replacement before the goodbye, and one at a time.
  const handler = launcher.slice(launcher.indexOf('cluster.on("message"'));
  assert.ok(
    handler.indexOf("spawn()") < handler.indexOf("worker.disconnect()"),
    "the replacement has to start before the worker it replaces is let go",
  );
  assert.match(
    handler,
    /recycling\.size > 0/,
    "workers grow together; recycling them together is an outage",
  );
});

test("the deploy ships what the launcher requires", async () => {
  const script = await readFile(
    path.join(ROOT, "scripts", "package-square.sh"),
    "utf8",
  );
  const launcher = await readFile(path.join(ROOT, "server.js"), "utf8");
  // Read from the launcher rather than listed here, so a module it starts to
  // require cannot be forgotten by the packager and by this test together.
  const required = [
    ...launcher.matchAll(/require\("\.\/([\w-]+)"\)/g),
  ].map(([, name]) => `${name}.js`);
  assert.ok(required.includes("igdb-budget.js"));
  for (const file of ["server.js", "worker-guard.js", ...required])
    assert.match(
      script,
      new RegExp(`cp "\\$\\{root\\}/${file.replace(".", "\\.")}"`),
      `${file} is required on boot and would be missing on Square Cloud`,
    );
});
