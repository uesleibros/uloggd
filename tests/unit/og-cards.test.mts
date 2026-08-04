import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * What the share cards are allowed to say.
 *
 * An unfurl is the least consenting surface on the site: it renders into
 * somebody else's chat, at full size, for people who never chose to open it.
 * Two of these had shipped wrong. The screenshot card read the sensitive flag
 * and then drew the picture anyway, and the list card never selected `kind`,
 * so every tierlist unfurled claiming to be a plain list.
 */
const ROOT = path.join(process.cwd(), "app", "[lang]");

async function ogRoutes(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await ogRoutes(full)));
    else if (entry.name === "opengraph-image.tsx") found.push(full);
  }
  return found;
}

test("every share card carries the brand mark", async () => {
  // Most go through `ogCard`, which draws it. The year retrospective has its
  // own layout and has to import the mark, which is how it ended up with its
  // own copy of the lettered placeholder and stayed on it after every other
  // card moved off.
  const routes = await ogRoutes(ROOT);
  assert.ok(routes.length >= 5, `only found ${routes.length} share cards`);
  for (const route of routes) {
    const source = await readFile(route, "utf8");
    const relative = path.relative(process.cwd(), route);
    assert.ok(
      source.includes("ogResponse") || source.includes("BRAND_MARK"),
      `${relative} neither uses the shared card nor draws the mark`,
    );
  }
});

test("every Open Graph card also serves the same image to Twitter", async () => {
  const routes = await ogRoutes(ROOT);
  for (const route of routes) {
    const twitterRoute = path.join(path.dirname(route), "twitter-image.tsx");
    const source = await readFile(twitterRoute, "utf8");
    assert.match(
      source,
      /from "\.\/opengraph-image"/,
      `${path.relative(process.cwd(), twitterRoute)} does not reuse its Open Graph card`,
    );
  }
});

test("wallet metadata describes and localizes the public collection", async () => {
  const page = await readFile(
    path.join(
      process.cwd(),
      "app",
      "[lang]",
      "wallet",
      "[username]",
      "page.tsx",
    ),
    "utf8",
  );
  assert.match(
    page,
    /socialMetadata\(\{[\s\S]*?path: `\/wallet\/\$\{profile\.username\}`/,
  );
  assert.match(page, /largeImage: true/);
});

test("the card header carries the real mark, not a placeholder", async () => {
  // It drew a blurple square with a letter in it for months. An unfurl is
  // often the first time somebody sees the site, and it was showing them a
  // logo that appears nowhere else on it.
  const card = await readFile(
    path.join(process.cwd(), "lib", "og-card.tsx"),
    "utf8",
  );
  assert.ok(
    card.includes("data:image/png;base64,"),
    "the brand mark is not inlined in the card",
  );
  assert.ok(
    !/borderRadius: 10,\s*background: "#5865f2",\s*color: "white",\s*\}\}\s*>\s*u\s*</.test(
      card,
    ),
    "the lettered placeholder is still being drawn",
  );
});

test("a sensitive screenshot never reaches an unfurl", async () => {
  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "[lang]",
      "shot",
      "[id]",
      "opengraph-image.tsx",
    ),
    "utf8",
  );
  assert.ok(
    /shot\.sensitive/.test(route),
    "the screenshot card does not consult the sensitive flag",
  );
  // Selecting the column and never branching on it is exactly the bug that
  // shipped, so the flag has to reach the image decision and not only the
  // query.
  assert.ok(
    /image:\s*shot\.sensitive/.test(route),
    "the sensitive flag does not gate the image",
  );
});

test("a tierlist unfurls as a tierlist", async () => {
  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "[lang]",
      "lists",
      "[id]",
      "opengraph-image.tsx",
    ),
    "utf8",
  );
  assert.ok(
    /select\([\s\S]*?\bkind\b/.test(route),
    "the list card does not select the kind it needs to name",
  );
  assert.ok(
    /kind === "TIERLIST"/.test(route),
    "the list card does not distinguish a tierlist",
  );
  assert.match(
    route,
    /getTierlistPreview/,
    "the tierlist card still counts the collection item table",
  );
  assert.match(
    route,
    /tierlistResponse/,
    "the tierlist card does not preview its tier rows",
  );
});

test("share-card images are detected from bytes instead of filename", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib", "og-image-source.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /DIRECTLY_RENDERABLE\.test\([^)]*\)\) return url/,
    "a misleading .jpg extension can still bypass image conversion",
  );
  assert.match(
    source,
    /source\[0\] === 0xff[\s\S]*source\[1\] === 0xd8/,
    "JPEG detection does not inspect the fetched bytes",
  );
  assert.match(
    source,
    /await fetch\(url/,
    "remote profile images are not fetched before their format is decided",
  );
});

test("the profile card shows the level", async () => {
  const route = await readFile(
    path.join(
      process.cwd(),
      "app",
      "[lang]",
      "u",
      "[username]",
      "opengraph-image.tsx",
    ),
    "utf8",
  );
  assert.ok(/level:/.test(route), "the profile card does not pass a level");
});
