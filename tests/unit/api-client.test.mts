import assert from "node:assert/strict";
import test from "node:test";
import { api, ApiError, settle } from "../../lib/api-client";

test("unreadable successful responses fail instead of becoming empty data", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("upstream returned HTML", { status: 200 });
    const result = await settle(
      api.get<{ data: unknown[] }>("/unreadable-test"),
    );
    assert.equal(result.data, null);
    assert.ok(result.error instanceof ApiError);
    assert.equal(result.error.code, "invalid_response");
    assert.equal(result.error.status, 502);
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(
      api.get("/missing-envelope-test"),
      (error: unknown) =>
        error instanceof ApiError && error.code === "invalid_response",
    );
    globalThis.fetch = async () => Response.json({ data: null });
    const empty = await settle(
      api.get<{ data: null }>("/confirmed-empty-test"),
    );
    assert.equal(empty.error, null);
    assert.equal(empty.data, null);
  } finally {
    globalThis.fetch = original;
  }
});
