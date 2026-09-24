import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveScreenshot,
  signIn,
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

  /**
   * Taking your own screenshots down, from the two places they are listed.
   *
   * Both were dead ends: the gallery card is one big link to the screenshot's
   * page, and the activity stream skipped screenshots when it drew the owner's
   * edit and remove controls, so the only way to delete one was to open it and
   * find the menu there, one at a time.
   */
  test("the owner can remove a screenshot where it is shown", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const owner = await createAccount("shotsdelete");
    accounts.push(owner);
    await giveScreenshot(owner, { game: 1, description: "taken down later" });
    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();

    // In the stream, beside the same controls a review of theirs carries.
    await page.goto(`/pt-BR/u/${owner.username}`);
    const entry = page.locator('.activity-entry[data-kind="screenshot"]');
    await expect(entry).toHaveCount(1, { timeout: 30_000 });
    await expect(entry.locator(".activity-entry-actions")).toBeVisible();

    // And on the gallery, over the tile. Two presses, like every other
    // removal: the first one only arms it.
    await page.goto(`/pt-BR/shots/${owner.username}`);
    const tile = page.locator(".screenshot-gallery-slot");
    await expect(tile).toHaveCount(1, { timeout: 30_000 });
    const remove = tile.locator(".screenshot-gallery-delete");
    await remove.click();
    await expect(remove).toHaveAttribute("data-armed", "true");
    await remove.click();
    await expect(page.locator(".screenshot-gallery-slot")).toHaveCount(0, {
      timeout: 30_000,
    });
    await context.close();
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
