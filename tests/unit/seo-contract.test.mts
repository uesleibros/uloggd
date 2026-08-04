import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

test("localized social metadata keeps canonical, hreflang and cards aligned", async () => {
  const source = await readFile(path.join(ROOT, "lib", "seo.ts"), "utf8");
  assert.match(source, /alternates: localeAlternates\(lang, path\)/);
  assert.match(source, /const url = `\/\$\{lang\}\$\{suffix\}`/);
  assert.match(source, /url,\s*locale: socialLocale\(lang\)/);
  assert.match(source, /openGraph,\s*twitter:/);
  assert.match(source, /image \? \{ images: \[image\] \} : \{\}/);
});

test("viewer-only pages use the shared noindex policy", async () => {
  const source = await readFile(path.join(ROOT, "lib", "seo.ts"), "utf8");
  assert.match(
    source,
    /privatePageMetadata = \{\s*robots: \{ index: false, follow: false \}/,
  );
});

test("every indexable public page owns a complete social metadata bundle", async () => {
  const pages = [
    "page.tsx",
    "game/[slug]/page.tsx",
    "publisher/[slug]/page.tsx",
    "entry/[id]/page.tsx",
    "journal/[id]/page.tsx",
    "lists/[id]/page.tsx",
    "review/[id]/page.tsx",
    "shot/[id]/page.tsx",
    "library/[username]/page.tsx",
    "reviews/[username]/page.tsx",
    "shots/[username]/page.tsx",
    "wallet/[username]/page.tsx",
    "u/[username]/page.tsx",
    "u/[username]/connections/page.tsx",
    "u/[username]/year/[year]/page.tsx",
    "search/page.tsx",
    "verification/page.tsx",
    "legal/[document]/page.tsx",
  ];
  for (const page of pages) {
    const source = await readFile(
      path.join(ROOT, "app", "[lang]", page),
      "utf8",
    );
    assert.ok(
      source.includes("socialMetadata(") || source.includes("openGraph:"),
      `${page} has no Open Graph metadata`,
    );
    assert.ok(
      source.includes("socialMetadata(") || source.includes("twitter:"),
      `${page} has no Twitter metadata`,
    );
    assert.ok(
      source.includes("socialMetadata(") ||
        source.includes("localeAlternates("),
      `${page} has no canonical/hreflang metadata`,
    );
  }
});

test("private shortcuts and account flows cannot inherit index=true", async () => {
  const pages = [
    "login/page.tsx",
    "lists/page.tsx",
    "library/page.tsx",
    "reviews/page.tsx",
    "shots/page.tsx",
    "wallet/page.tsx",
    "onboarding/username/page.tsx",
    "moderation/page.tsx",
    "settings/layout.tsx",
    "auth/layout.tsx",
  ];
  for (const page of pages) {
    const source = await readFile(
      path.join(ROOT, "app", "[lang]", page),
      "utf8",
    );
    assert.match(
      source,
      /privatePageMetadata/,
      `${page} does not declare the private noindex policy`,
    );
  }
});

test("robots excludes every authenticated workspace shortcut", async () => {
  const source = await readFile(path.join(ROOT, "app", "robots.ts"), "utf8");
  for (const segment of [
    "library",
    "lists",
    "login",
    "reviews",
    "shots",
    "suspended",
    "wallet",
  ])
    assert.match(source, new RegExp(`\\"${segment}\\"`));
});

test("sitemap advertises each public profile collection and deduplicates URLs", async () => {
  const source = await readFile(path.join(ROOT, "app", "sitemap.ts"), "utf8");
  for (const segment of ["library", "reviews", "lists", "shots", "wallet"])
    assert.match(source, new RegExp("`/" + segment + "/\\$\\{username\\}`"));
  assert.match(source, /function uniqueEntries/);
  assert.match(source, /return uniqueEntries\(\[/);
});
