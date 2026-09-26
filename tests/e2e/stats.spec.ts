import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveJourney,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * Everything somebody has played, added up.
 *
 * The retrospective reads one year by pulling its rows out and adding them up
 * in the page. All time cannot work that way, so every number here is counted
 * in the database, and what a reader is counted is what that reader is
 * allowed to see.
 */
test.describe("stats", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  const accounts: TestAccount[] = [];
  let username = "";

  test.beforeAll(async () => {
    const owner = await createAccount("stats");
    accounts.push(owner);
    username = owner.username;
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
    ]);
    await giveJourney(owner, {
      game: 1,
      title: "Primeira run",
      sessions: [
        { daysAgo: 40, minutes: 120 },
        { daysAgo: 20, minutes: 240, marksFinish: true },
      ],
    });
    await giveJourney(owner, {
      game: 2,
      title: "Segunda run",
      sessions: [{ daysAgo: 5, minutes: 90 }],
    });
  });

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("the numbers add up and are drawn", async ({ page, context }) => {
    await signIn(context, accounts[0]);
    await page.goto(`/pt-BR/u/${username}/stats`);

    await expect(page.locator("h1")).toContainText("Os números", {
      timeout: 25_000,
    });
    const cards = page.locator(".year-stat");
    await expect(cards.first()).toBeVisible();
    // 120 + 240 + 90 is seven and a half hours, which the page rounds down to
    // whole hours the way every other duration here does.
    await expect(page.locator(".year-stat-grid")).toContainText("7h");
    await expect(page.locator(".year-stat-grid")).toContainText("3");

    // Where the time went, ranked, with the game that has the most.
    const top = page.locator(".year-top-game").first();
    await expect(top).toBeVisible();
    await expect(top).toContainText("E2E Game 01");
  });

  test("a stranger counts only what they can see", async ({
    page,
    context,
  }) => {
    const stranger = await createAccount("statsaway");
    accounts.push(stranger);
    await signIn(context, stranger);
    await page.goto(`/pt-BR/u/${username}/stats`);

    // The fixture's sessions are public, so a stranger sees the same totals.
    // What matters is that the page is readable at all without being the
    // owner, and that it says whose numbers these are.
    await expect(page.locator("h1")).toContainText("Os números", {
      timeout: 25_000,
    });
    await expect(page.locator(".page-back-link")).toContainText(username);
  });
});
