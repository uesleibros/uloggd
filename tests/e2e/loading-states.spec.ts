import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
} from "./fixtures/account";

test("a delayed library uses the actual card widths and gaps", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(90_000);
  const owner = await createAccount("loadinggrid");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await giveLibrary(
      owner,
      Array.from({ length: 12 }, (_, index) => ({
        game: index + 1,
        status: "PLAYING" as const,
      })),
    );
    await signIn(context, owner);
    await page.route("**/api/v1/profiles/*/library?*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`/pt-BR/library/${owner.username}`);
    const skeleton = page.locator(
      '.library-page:not(.library-loading):visible [data-shelf-skeleton="library"]',
    );
    await expect(skeleton).toBeVisible();
    const covers = skeleton.locator(".library-loading-card > i");
    await expect(covers.first()).toBeVisible();
    await expect(covers.nth(1)).toBeVisible();
    await page
      .getByRole("button", { name: "Continuar com necessários" })
      .click();
    await covers.first().scrollIntoViewIfNeeded();
    const before = await covers.first().boundingBox();
    const secondBefore = await covers.nth(1).boundingBox();
    expect(before).not.toBeNull();
    expect(secondBefore).not.toBeNull();
    await page.screenshot({
      path: `test-results/library-loading-${test.info().project.name}.png`,
    });
    release();
    await expect(skeleton).toHaveCount(0);
    const real = page.locator(
      '.library-results[data-view="grid"] .quick-cover',
    );
    await expect(real).toHaveCount(12);
    const after = await real.first().boundingBox();
    const secondAfter = await real.nth(1).boundingBox();
    expect(Math.abs(after!.width - before!.width)).toBeLessThan(2);
    expect(Math.abs(after!.height - before!.height)).toBeLessThan(2);
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(4);
    expect(
      Math.abs(secondAfter!.x - after!.x - (secondBefore!.x - before!.x)),
    ).toBeLessThan(2);
    await page.screenshot({
      path: `test-results/library-loaded-${test.info().project.name}.png`,
    });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
    await destroyAccount(owner);
  }
});

test("opening Series never inserts a collection while its answer is delayed", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(90_000);
  const owner = await createAccount("loadingseries");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    await page.route("**/api/v1/library/series?*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    const workspace = page.locator(
      '.series-workspace[data-loaded="false"]:visible',
    );
    await expect(workspace).toBeVisible();
    await expect(workspace.locator(".library-series-skeleton-row")).toHaveCount(
      6,
    );
    await expect(
      page.locator('[data-shelf-skeleton="library"]:visible'),
    ).toHaveCount(0);
    await page.screenshot({
      path: `test-results/series-loading-${test.info().project.name}.png`,
    });
    release();
    await expect(
      page.locator('.series-workspace[data-loaded="true"]'),
    ).toBeVisible();
    await expect(
      page.locator(".library-series-skeleton-row:visible"),
    ).toHaveCount(0);
    await expect(page.locator(".library-stats-skeleton:visible")).toHaveCount(
      0,
    );
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
    await destroyAccount(owner);
  }
});

for (const scope of ["lists", "people", "companies", "reviews"]) {
  test(`a delayed ${scope} search keeps its own result shape`, async ({
    page,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/v1/search/${scope}?*`, async (route) => {
      await held;
      await route.fulfill({ json: { data: [], total: 0, total_pages: 0 } });
    });
    try {
      await page.goto(`/pt-BR/search?scope=${scope}`);
      const results = page.locator(".entity-search-results:visible");
      await expect(results).toBeVisible();
      await expect(
        page.locator(".catalog-results-loading-grid:visible"),
      ).toHaveCount(0);
      if (scope === "reviews")
        await expect(
          results.locator('[data-shelf-skeleton="stream"]'),
        ).toBeVisible();
      else
        await expect(results.locator(".entity-result-loading")).toHaveCount(24);
      release();
      await expect(
        results.locator(".entity-result-loading, [data-shelf-skeleton]"),
      ).toHaveCount(0);
    } finally {
      release();
      await page.unrouteAll({ behavior: "wait" });
    }
  });
}
