import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  type TestAccount,
} from "./fixtures/account";

/**
 * A collection opens on a shelf that has something on it.
 *
 * The library opens on "Playing", because the usual question is what someone
 * is on right now. For a collection with nothing being played that answered a
 * question nobody asked: a visitor opening forty games was told "no games
 * found", with the real shelves a click away and no sign that they held
 * anything.
 */
test.describe("a public library", () => {
  test.skip(!canSignIn, "needs the Supabase keys");

  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("shows its games when nothing is being played", async ({ page }) => {
    const owner = await createAccount("libshelf");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "COMPLETED" },
      { game: 3, status: "BACKLOG" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    await expect(page.locator(".quick-game-card").first()).toBeVisible();
    expect(await page.locator(".quick-game-card").count()).toBe(3);
    await expect(page.locator(".library-filter-empty")).toHaveCount(0);
    // No shelf is chosen: every game is on screen, and the shelves are there
    // to narrow it down.
    await expect(
      page.locator("[role='tab'][aria-selected='true']"),
    ).toHaveCount(0);
  });

  test("opens on what is being played when there is any", async ({ page }) => {
    const owner = await createAccount("libplay");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "COMPLETED" },
      { game: 3, status: "COMPLETED" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    await expect(page.locator("[role='tab'][aria-selected='true']")).toHaveText(
      /Jogando/,
    );
    await expect(page.locator(".quick-game-card")).toHaveCount(1);
  });
});
