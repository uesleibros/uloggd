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
 * A named playthrough, read on its own page.
 *
 * The page has two halves that are easy to break apart without noticing: the
 * timeline of sessions, and the rail that jumps between them. The rail spent
 * some time rendering underneath the timeline at every width, where a jump
 * list is four sessions named a second time below the four cards it points
 * at, and nothing failed.
 */
test.describe("journal", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });

  const accounts: TestAccount[] = [];
  let publicId = "";

  test.beforeAll(async () => {
    const owner = await createAccount("journal");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    const journey = await giveJourney(owner, {
      game: 1,
      title: "Primeira run, sem guia",
      sessions: [
        { daysAgo: 20, minutes: 95, note: "Começou hoje.", marksStart: true },
        { daysAgo: 14, minutes: 130 },
        { daysAgo: 3, minutes: 210, note: "Terminei.", marksFinish: true },
      ],
    });
    publicId = journey.public_id;
  });

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("the jump rail sits beside the timeline, then under it", async ({
    page,
    context,
  }) => {
    await signIn(context, accounts[0]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/pt-BR/journal/${publicId}`);

    const timeline = page.locator(".journal-page-timeline");
    const rail = page.locator(".journal-page-rail");
    await expect(timeline).toBeVisible();
    await expect(rail).toBeVisible();

    const wide = await page.evaluate(() => {
      const a = document
        .querySelector(".journal-page-timeline")!
        .getBoundingClientRect();
      const b = document
        .querySelector(".journal-page-rail")!
        .getBoundingClientRect();
      return {
        beside: b.left >= a.right - 2,
        railTop: b.top,
        timelineTop: a.top,
      };
    });
    expect(wide.beside).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const narrow = await page.evaluate(() => {
      const a = document
        .querySelector(".journal-page-timeline")!
        .getBoundingClientRect();
      const b = document
        .querySelector(".journal-page-rail")!
        .getBoundingClientRect();
      return b.top >= a.bottom - 2;
    });
    expect(narrow).toBe(true);
  });

  test("the hero actions fit the phone they are on", async ({
    page,
    context,
  }) => {
    await signIn(context, accounts[0]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/pt-BR/journal/${publicId}`);

    const log = page.locator(".journal-page-log");
    await expect(log).toBeVisible();
    // The label used to be wider than the button, because the link landed in
    // the cover's 76px column and spilled out of it across the share button.
    const fits = await log.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return {
        overflow: el.scrollWidth - Math.ceil(box.width),
        width: box.width,
      };
    });
    expect(fits.overflow).toBeLessThanOrEqual(1);
    expect(fits.width).toBeGreaterThan(100);

    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  });

  test("the period reads without being cut off", async ({ page, context }) => {
    await signIn(context, accounts[0]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/pt-BR/journal/${publicId}`);
    // Both ends carried the year in a tile a quarter of the row wide, so the
    // range always ended in an ellipsis.
    const cut = await page.evaluate(() => {
      const tiles = Array.from(
        document.querySelectorAll<HTMLElement>(".journal-page-stats dd"),
      );
      return tiles
        .filter(
          (el) =>
            el.scrollWidth > Math.ceil(el.getBoundingClientRect().width) + 1,
        )
        .map((el) => el.textContent);
    });
    expect(cut).toEqual([]);
  });
});
