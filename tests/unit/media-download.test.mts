import assert from "node:assert/strict";
import test from "node:test";
import { downloadUserMedia } from "../../lib/media-download.ts";

const key =
  "avatars/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.avif";
test("owned CDN downloads follow only Square Blob redirects for the identical key", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (url) => {
      calls++;
      if (calls === 1)
        return new Response(null, {
          status: 302,
          headers: { location: `https://blob.squarecloud.dev/pub/test/${key}` },
        });
      assert.equal(String(url), `https://blob.squarecloud.dev/pub/test/${key}`);
      return new Response(new Uint8Array([1, 2, 3]));
    };
    assert.deepEqual(await downloadUserMedia(key), Buffer.from([1, 2, 3]));
    globalThis.fetch = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/private" },
      });
    await assert.rejects(downloadUserMedia(key), /untrusted image redirect/);
    globalThis.fetch = async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: `https://blob.squarecloud.dev/pub/test/${key.replace("22222222", "33333333")}`,
        },
      });
    await assert.rejects(downloadUserMedia(key), /untrusted image redirect/);
    globalThis.fetch = async () =>
      new Response("too large", {
        headers: { "content-length": String(16 * 1024 * 1024) },
      });
    await assert.rejects(downloadUserMedia(key), /too large/);
    await assert.rejects(
      downloadUserMedia("https://example.com/private"),
      /untrusted image location/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
