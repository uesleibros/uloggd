import { expect, test } from "@playwright/test";

/**
 * The pictures that appear when somebody pastes a link.
 *
 * Never tested, and it showed. Two of these routes were unreachable in ways no
 * unit test could see: the card for the locale root was answered by the proxy
 * with a 404, and once that was fixed, with a redirect to the login page,
 * because a link previewer arrives without cookies and anything outside the
 * public list is bounced. Both were found by requesting the URL, which is
 * exactly the kind of check worth automating.
 *
 * Requested the way a previewer requests them: no session, no referrer, just
 * the address out of the page's own markup.
 */

/** The first eight bytes of every PNG. Satori's output has to start with them. */
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const PAGES = [
  ["home", "/pt-BR"],
  ["a profile", "/pt-BR/u/UesleiDev"],
  ["a game", "/pt-BR/game/hades"],
] as const;

for (const [label, path] of PAGES) {
  test(`${label} advertises a card that actually renders`, async ({
    page,
    request,
  }) => {
    await page.goto(path);
    const declared = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(declared, `${label} declares no og:image`).toBeTruthy();

    // The tag carries an absolute production URL; only the path is ours to
    // request against the server under test.
    const target = new URL(declared!).pathname + new URL(declared!).search;
    const response = await request.get(target);

    expect(
      response.status(),
      `${label} advertises ${target}, which answered ${response.status()}`,
    ).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");

    const body = await response.body();
    expect(
      body.subarray(0, 8).equals(PNG_SIGNATURE),
      `${target} answered 200 but the bytes are not a PNG`,
    ).toBe(true);
    // A card that renders to almost nothing is a card that failed quietly.
    expect(body.byteLength).toBeGreaterThan(5_000);
  });
}

test("a card is cached by whatever sits in front of it", async ({ request }) => {
  // The reason unfurls were slow: every card answered `max-age=0,
  // must-revalidate`, so each paste of a link paid a full render again. The
  // shared cache directive is the fix, and it is invisible to every other test.
  const response = await request.get("/pt-BR/opengraph-image");
  expect(response.status()).toBe(200);
  const cacheControl = response.headers()["cache-control"] ?? "";
  expect(cacheControl, "the card tells caches to keep nothing").toMatch(
    /s-maxage=\d+/,
  );
  expect(cacheControl).toMatch(/stale-while-revalidate=\d+/);
});

test("cards are reachable without an account", async ({ request }) => {
  // A previewer has no cookies. The proxy answers anything outside its public
  // list with a redirect to the login page, and a card that redirects is a
  // link that unfurls as nothing.
  for (const path of ["/pt-BR/opengraph-image", "/pt-BR/twitter-image"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} did not answer directly`).toBe(200);
  }
});
