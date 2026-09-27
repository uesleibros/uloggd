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
 * asked about, so six series is two requests to the catalogue rather than
 * twelve.
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

  test("three of eight, and the gap is drawn too", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("series");
    accounts.push(owner);
    await signIn(context, owner);
    // The fixture catalogue files its first eight games as one saga and the
    // rest as standalone, so a library of four says something a library of
    // four random games could not.
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG" },
      { game: 40, status: "BACKLOG" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}`);
    const series = page.locator(".library-series");
    await expect(series).toBeVisible({ timeout: 30_000 });
    await expect(series).toContainText("E2E Saga");
    await expect(series).toContainText("3/8 jogados");
    await expect(series).toContainText("1 concluídos");

    // Every game of the series is drawn, not only the owned ones: the gap is
    // the information, and a row made of what somebody has cannot show one.
    await expect(series.locator(".library-series-covers li")).toHaveCount(8);
    await expect(
      series.locator('.library-series-covers li[data-state="none"]'),
    ).toHaveCount(5);
    // And the standalone game is not a series of its own.
    await expect(series.locator(".library-series-list > li")).toHaveCount(1);

    // The next one is the first the library does not have, in release order.
    await expect(series.locator(".library-series-next")).toContainText(
      "E2E Game 04",
    );
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
    const series = page.locator(".library-series");
    await expect(series).toContainText("3/8 jogados", { timeout: 30_000 });

    // Setting two entries aside: a broadcast that no longer exists and one
    // nobody wants. They stay in the row and leave the denominator.
    const covers = series.locator(".library-series-covers li");
    await covers.nth(7).locator(".series-ignore").click();
    await expect(series).toContainText("3/7 jogados", { timeout: 20_000 });
    await covers.nth(6).locator(".series-ignore").click();
    await expect(series).toContainText("3/6 jogados", { timeout: 20_000 });
    await expect(series).toContainText("2 ignorados");
    await expect(
      series.locator(".library-series-covers li[data-ignored]"),
    ).toHaveCount(2);
    // Eight games are still drawn: the gap is part of the series.
    await expect(covers).toHaveCount(8);

    // It survives a reload, and it can be taken back.
    await page.reload();
    await expect(series).toContainText("3/6 jogados", { timeout: 30_000 });
    await page
      .locator(".library-series-covers li")
      .nth(7)
      .locator(".series-ignore")
      .click();
    await expect(series).toContainText("3/7 jogados", { timeout: 20_000 });
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
    await expect(page.locator(".library-page-body")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator(".library-series")).toHaveCount(0);
  });
});
