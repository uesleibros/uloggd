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
 * A library seen as the series it is made of.
 *
 * The game page answers this about the series in front of it. Here it is asked
 * of the whole shelf, which is a different question with a different cost: the
 * library is grouped first, and only the few series it is really made of are
 * asked about, so series membership and edition pages share batched catalogue queries.
 *
 * The owner's own. It is read through their library, and there is no question
 * here a stranger is owed.
 */
test.describe("the series a library is made of", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(120_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("two started out of eight, and the gap is drawn too", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("series");
    accounts.push(owner);
    await signIn(context, owner);
    // The fixture catalogue files its first eight games as one saga and the
    // additional fixtures include other sagas; game 40 is standalone.
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(
      ".library-series:not(.library-series-skeleton):visible",
    );
    await expect(series).toBeVisible({ timeout: 30_000 });
    await expect(series).toContainText("E2E Saga");
    await expect(series).toContainText("2/8 jogados");
    await expect(series).toContainText("1 concluído");

    // Every game of the series is drawn, not only the owned ones: the gap is
    // the information, and a row made of what somebody has cannot show one.
    await expect(series.locator(".library-series-covers li")).toHaveCount(8);
    await expect(
      series.locator('.library-series-covers li[data-state="none"]'),
    ).toHaveCount(5);
    // And the standalone game is not a series of its own.
    await expect(series.locator(".library-series-list > li")).toHaveCount(1);

    // The next one is the first unstarted slot, including backlog, in release order.
    await expect(series.locator(".library-series-next")).toContainText(
      "E2E Game 03",
    );

    // Starting on a cover must scroll the strip, not pick up the browser's
    // native image/link drag or accidentally open the game.
    if (test.info().project.name === "desktop-chromium") {
      const strip = series.locator(".library-series-covers");
      await strip.evaluate((element) => {
        element.style.width = "240px";
      });
      await strip.scrollIntoViewIfNeeded();
      const cover = await strip.locator("a").nth(2).boundingBox();
      expect(cover).not.toBeNull();
      const x = cover!.x + 20;
      const y = cover!.y + 35;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 120, y, { steps: 8 });
      await page.mouse.up();
      expect(
        await strip.evaluate((element) => element.scrollLeft),
      ).toBeGreaterThan(0);
      await expect(page).toHaveURL(`/pt-BR/library/${owner.username}`);
    }
  });

  test("a game nobody can play stops counting", async ({ page, context }) => {
    const owner = await createAccount("seriesskip");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(
      ".library-series:not(.library-series-skeleton):visible",
    );
    await expect(series).toContainText("2/8 jogados", { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    const routeRefreshes: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname.endsWith(`/library/${owner.username}`) &&
        url.searchParams.has("_rsc")
      )
        routeRefreshes.push(request.url());
    });

    // Setting two entries aside: a broadcast that no longer exists and one
    // nobody wants. They stay in the row and leave the denominator.
    const covers = series.locator(".library-series-covers li");
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/library/ignored") &&
        response.request().method() === "POST",
    );
    await covers.nth(7).locator(".series-ignore").click();
    await saved;
    await page.waitForLoadState("networkidle");
    expect(routeRefreshes).toHaveLength(0);
    await expect(series).toContainText("2/7 jogados", { timeout: 20_000 });
    await covers.nth(6).locator(".series-ignore").click();
    await expect(series).toContainText("2/6 jogados", { timeout: 20_000 });
    await expect(series).toContainText("2 ignorados");
    await expect(
      series.locator(".library-series-covers li[data-ignored]"),
    ).toHaveCount(2);
    // Eight games are still drawn: the gap is part of the series.
    await expect(covers).toHaveCount(8);

    // It survives a reload, and it can be taken back.
    await page.reload();
    await expect(series).toContainText("2/6 jogados", { timeout: 30_000 });
    await page
      .locator(".library-series-covers li")
      .nth(7)
      .locator(".series-ignore")
      .click();
    await expect(series).toContainText("2/7 jogados", { timeout: 20_000 });
  });

  test("ignoring every entry keeps the series available to undo", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("seriesallskip");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(
      ".library-series:not(.library-series-skeleton):visible",
    );
    await expect(series).toContainText("2/8 jogados", { timeout: 30_000 });
    const covers = series.locator(".library-series-covers li");
    for (let index = 0; index < 8; index += 1)
      await covers.nth(index).locator(".series-ignore").click();

    await expect(series).toContainText("0/0 jogados");
    await expect(series).toContainText("8 ignorados");
    await expect(covers).toHaveCount(8);
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(series).toContainText("0/0 jogados", { timeout: 30_000 });
    await covers.nth(7).locator(".series-ignore").click();
    await expect(series).toContainText("0/1 jogados");
  });

  test("the press lands before the network does", async ({ page, context }) => {
    const owner = await createAccount("seriesfast");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);

    // The write is held open for most of a second, which is what a bad
    // connection does and what made this control feel broken: the mark, the
    // denominator and the next game all waited for it.
    let held = 0;
    await page.route("**/api/v1/library/ignored**", async (route) => {
      held += 1;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(
      ".library-series:not(.library-series-skeleton):visible",
    );
    await expect(series).toContainText("2/8 jogados", { timeout: 30_000 });
    await expect(series).toContainText("E2E Game 03");
    // Pressed after the page is interactive: a click on a button React has
    // not picked up yet is a click nobody handles, which is a fact about the
    // harness rather than about the feature.
    await page.waitForLoadState("networkidle");

    const covers = series.locator(".library-series-covers li");
    await covers.nth(2).locator(".series-ignore").click();
    // Within a fraction of the request: the count, the mark and the sentence
    // about what comes next have all already moved.
    await expect(series).toContainText("2/7 jogados", { timeout: 250 });
    await expect(series).toContainText("1 ignorado", { timeout: 250 });
    await expect(covers.nth(2)).toHaveAttribute("data-ignored", "true");
    await expect(series.locator(".library-series-next")).toContainText(
      "E2E Game 04",
      { timeout: 250 },
    );
    expect(held).toBeGreaterThan(0);

    // And undoing it is just as immediate, without waiting for the first
    // request to come back.
    await covers.nth(2).locator(".series-ignore").click();
    await expect(series).toContainText("2/8 jogados", { timeout: 250 });
    await expect(series.locator(".library-series-next")).toContainText(
      "E2E Game 03",
      { timeout: 250 },
    );

    // Once the queue has settled, the database says the same thing: the last
    // press wins however many were made while the network was busy.
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.waitForTimeout(2500);
    await page.reload();
    await expect(series).toContainText("2/8 jogados", { timeout: 30_000 });
    await expect(
      series.locator(".library-series-covers li[data-ignored]"),
    ).toHaveCount(0);
  });

  test("three quick presses end pressed", async ({ page, context }) => {
    const owner = await createAccount("seriesspam");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);
    await page.route("**/api/v1/library/ignored**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.continue();
    });

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(
      ".library-series:not(.library-series-skeleton):visible",
    );
    await expect(series).toContainText("2/8 jogados", { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    const button = series
      .locator(".library-series-covers li")
      .nth(5)
      .locator(".series-ignore");

    await button.click();
    await button.click();
    await button.click();
    await expect(series).toContainText("2/7 jogados", { timeout: 250 });

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.waitForTimeout(2500);
    await page.reload();
    // Three presses from nothing is ignored, on screen and in the database.
    await expect(series).toContainText("2/7 jogados", { timeout: 30_000 });
    await expect(
      series.locator(".library-series-covers li[data-ignored]"),
    ).toHaveCount(1);
  });

  test("a visitor is not shown somebody else's progress", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("seriesown");
    const visitor = await createAccount("seriesaway");
    accounts.push(owner, visitor);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "COMPLETED" },
      { game: 3, status: "COMPLETED" },
      { game: 4, status: "COMPLETED" },
    ]);

    await signIn(context, visitor);
    await page.goto(`/pt-BR/library/${owner.username}`);
    // The shelf is public and readable; the series reading is not part of it.
    const shelf = page.locator(
      ".library-page:not(.library-loading) .library-page-body:visible",
    );
    await expect(shelf).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(shelf).toBeVisible();
    await expect(shelf.locator(".quick-game-card:visible")).toHaveCount(4);
    await expect(page.locator(".library-series")).toHaveCount(0);
  });
});
