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
  assert.equal(observed.queue, 4);
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
