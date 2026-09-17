import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveScreenshot,
  type TestAccount,
} from "./fixtures/account";

/**
 * The screenshot gallery, which the browser reads for itself.
 *
 * The page used to read the gallery on the server, hydrate every game in it
 * from IGDB, and only then answer, so nothing was on screen until both had
 * finished. Now the hero goes out on the profile alone and the grid arrives
 * underneath it, which is worth a test of its own: the suite could otherwise
 * pass on a page that renders its frame and never fills it.
 */
test.describe("screenshot gallery", () => {
  test.skip(!canSignIn, "needs the Supabase keys");

  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("the frame arrives first and the grid fills in", async ({ page }) => {
    test.setTimeout(90_000);
    const owner = await createAccount("shotsgrid");
    accounts.push(owner);
    await giveScreenshot(owner, { game: 1, description: "a kept moment" });
    await giveScreenshot(owner, { game: 2, description: "another one" });

    await page.goto(`/pt-BR/shots/${owner.username}`);
    // The heading does not wait on the gallery.
    await expect(page.locator("main h1").first()).toBeVisible();

    await expect(page.locator("[data-shelf-skeleton]")).toHaveCount(0, {
      timeout: 30_000,
    });

    // Both rows, drawn from the catalogue entries the same read returned.
    await expect(page.locator(".screenshot-gallery-grid > *")).toHaveCount(2);
    // The counts in the tabs and the hero came from that read too, so a frame
    // that renders without them is a page that looks finished and is not.
    await expect(page.locator(".reviews-scope-tabs a")).toHaveCount(3);
    await expect(page.locator(".workspace-hero")).toContainText("2");
  });

  test("a filter is a read rather than a page", async ({ page }) => {
    const owner = await createAccount("shotsfilter");
    accounts.push(owner);
    await giveScreenshot(owner, { game: 1, description: "kept" });

    await page.goto(`/pt-BR/shots/${owner.username}?spoilers=spoilers`);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator("[data-shelf-skeleton]")).toHaveCount(0, {
      timeout: 30_000,
    });
    // Nothing is marked as a spoiler, so this filter empties the grid without
    // emptying the page: the tabs and the way back stay put.
    await expect(page.locator(".screenshot-gallery-grid > *")).toHaveCount(0);
    await expect(page.locator(".reviews-scope-tabs a")).toHaveCount(3);
  });
});
