import assert from "node:assert/strict";
import test from "node:test";
import { createOgRenderCache } from "../../lib/og-render-cache.ts";

test("share images coalesce renders and return independent response bodies", async () => {
  const render = createOgRenderCache();
  let calls = 0;
  const generate = () => {
    calls++;
    return new Response("png", {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, s-maxage=3600",
      },
    });
  };
  const [first, second] = await Promise.all([
    render("same", generate),
    render("same", generate),
  ]);
  assert.equal(await first.text(), "png");
  assert.equal(await second.text(), "png");
  assert.equal(second.headers.get("cache-control"), "public, s-maxage=3600");
  assert.equal(await (await render("same", generate)).text(), "png");
  assert.equal(calls, 1);
});

test("share images enforce byte limits, LRU, expiry and retry failed renders", async () => {
  let time = 0;
  let calls = 0;
  const render = createOgRenderCache({
    maxBytes: 6,
    maxEntries: 3,
    ttlMs: 100,
    now: () => time,
  });
  const generate = () => {
    calls++;
    return new Response("png");
  };
  await render("a", generate);
  await render("b", generate);
  await render("a", generate);
  await render("c", generate);
  await render("b", generate);
  assert.equal(
    calls,
    4,
    "the least recently used image is evicted by the byte budget",
  );
  time = 101;
  await render("b", generate);
  assert.equal(calls, 5);
  await render("large", () => new Response("too large"));
  await render("large", generate);
  assert.equal(calls, 6, "oversized PNGs are delivered without retention");
  await assert.rejects(
    render("failed", () => {
      throw new Error("render failed");
    }),
  );
  assert.equal(await (await render("failed", generate)).text(), "png");
});
