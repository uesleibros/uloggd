import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * A session you open, not a form you fill in.
 *
 * The whole promise of the playlog is that it costs one press to start and one
 * line to write in, so what is worth proving here is exactly that: the bar
 * appears without a dialog, it survives walking to another page, what was
 * noted during the session ends up on the entry afterwards, and a session
 * that recorded nothing can be thrown away instead of becoming a record of
 * nothing.
 */
test.describe("playlog", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });
  // Each of these walks several pages and four routes, and in dev every one
  // of them is compiled the first time it is asked for.
  test.setTimeout(120_000);

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  async function ready(context: Parameters<typeof signIn>[0], label: string) {
    const owner = await createAccount(label);
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    return owner;
  }

  test("a session opens, follows you and becomes an entry", async ({
    page,
    context,
  }) => {
    await ready(context, "playlog");

    await page.goto("/pt-BR/game/e2e-game-1");
    const start = page.getByRole("button", { name: /Jogando agora/i });
    await expect(start).toBeVisible({ timeout: 20_000 });
    await start.click();

    // One press, no dialog: the bar is the interface from here on.
    const bar = page.locator(".play-bar");
    await expect(bar).toBeVisible({ timeout: 15_000 });
    await expect(bar).toContainText("E2E Game 01");

    await bar.locator(".play-bar-identity").click();
    const field = bar.locator(".play-bar-add input");
    await field.fill("cheguei na segunda area");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(bar.locator(".play-bar-events")).toContainText(
      "cheguei na segunda area",
      { timeout: 15_000 },
    );

    // It lives in the shell, so walking somewhere else neither closes it nor
    // restarts its clock.
    await page.goto("/pt-BR/search");
    await expect(page.locator(".play-bar")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".play-bar")).toContainText("E2E Game 01");

    await page.locator(".play-bar-stop").click();
    const dialog = page.locator(".play-close-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("textarea").fill("uma sessao curta");
    await dialog.locator(".play-close-confirm").click();
    await expect(page.locator(".play-bar")).toHaveCount(0, { timeout: 20_000 });

    // And what was noted while it ran is on the entry it became.
    await page.goto("/pt-BR/game/e2e-game-1/logs");
    await page.locator('a[href*="/entry/"]').first().click();
    const timeline = page.locator(".play-timeline");
    await expect(timeline).toBeVisible({ timeout: 20_000 });
    await expect(timeline).toContainText("cheguei na segunda area");
  });

  test("a session that recorded nothing can be thrown away", async ({
    page,
    context,
  }) => {
    await ready(context, "playdrop");

    await page.goto("/pt-BR/game/e2e-game-1");
    await page.getByRole("button", { name: /Jogando agora/i }).click();
    const bar = page.locator(".play-bar");
    await expect(bar).toBeVisible({ timeout: 20_000 });

    await bar.locator(".play-bar-stop").click();
    const dialog = page.locator(".play-close-dialog");
    // Only while it is empty: opened and forgotten is not a thing somebody
    // did, and a row saying they played for no time is worse than no row.
    await dialog.locator(".play-close-discard").click();
    await expect(page.locator(".play-bar")).toHaveCount(0, { timeout: 20_000 });

    await page.goto("/pt-BR/game/e2e-game-1/logs");
    await expect(page.locator('a[href*="/entry/"]')).toHaveCount(0);
  });
});
