import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("Redis handshake stalls have bounded deadlines, one connection and a fast cooldown", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      "./scripts/catalog-runtime.cjs",
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/unit/fixtures/catalog-redis-client-probe.cjs",
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout.trim());
  assert.equal(observed.connections, 1);
  assert.equal(observed.connections, observed.before);
  assert.equal(observed.rejected, 12);
  assert.ok(observed.elapsedMs < 4000);
  assert.ok(observed.retryMs < 100);
  assert.equal(observed.verifiedTls, true);
  assert.equal(observed.ca, "trusted\ncertificate");
  // Room for a page's lookups to share one round trip. Four was the ceiling
  // that sent the fifth lookup on a page to PostgreSQL after making it wait.
  assert.ok(observed.queue >= 64);
});

test("lookups pipeline on one connection instead of queueing four at a time", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      "./scripts/catalog-runtime.cjs",
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/unit/fixtures/catalog-redis-client-probe.cjs",
      "lookups",
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout.trim());
  assert.equal(observed.connections, 1);
  assert.equal(observed.answered, 24);
  // The fake server holds every reply for 100 ms. Twenty-four lookups in
  // groups of four would take six of those; pipelined they take about one.
  assert.ok(observed.elapsedMs < 400, `took ${observed.elapsedMs} ms`);
});

test("a slow lookup gives up quickly and leaves the connection alone", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      "./scripts/catalog-runtime.cjs",
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/unit/fixtures/catalog-redis-client-probe.cjs",
      "slow-lookup",
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout.trim());
  // Gave up inside the read deadline rather than the old 1.5 s.
  assert.ok(observed.firstMs < 700, `took ${observed.firstMs} ms`);
  // One slow reply does not cost a reconnection.
  assert.equal(observed.connections, 1);
  assert.equal(observed.secondAnswered, true);
});

test("a written Redis command cannot hang indefinitely waiting for its reply", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      "./scripts/catalog-runtime.cjs",
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/unit/fixtures/catalog-redis-client-probe.cjs",
      "command",
    ],
    { encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout.trim());
  assert.ok(
    observed.evaluations > 0,
    "the server accepted the handshake and received EVAL",
  );
  assert.equal(observed.rejected, 12);
  assert.equal(observed.connections, 1);
  assert.ok(observed.elapsedMs < 4000);
  assert.ok(observed.retryMs < 100);
});
