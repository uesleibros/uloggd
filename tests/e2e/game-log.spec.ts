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
 * The composer on a game page: reviews, the diary, journeys and screenshots,
 * all behind one dialog.
 *
 * It had no coverage at all until now, because `E2E_ENABLED` nulled the
 * database on the game page and every signed-in visit bounced to the home
 * page. These pin what it does before it is taken apart, so the taking apart
 * can be checked rather than hoped about.
 */
test.describe("game log composer", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });

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

  test("the chooser lists every journey of the game", async ({
    page,
    context,
  }) => {
    const owner = await ready(context, "chooser");
    await giveJourney(owner, {
      game: 1,
      title: "Primeira run",
      sessions: [
        { daysAgo: 12, minutes: 95 },
        { daysAgo: 5, minutes: 140 },
      ],
    });
    await giveJourney(owner, {
      game: 1,
      title: "New Game+",
      sessions: [{ daysAgo: 2, minutes: 60 }],
    });

    await page.goto("/pt-BR/game/e2e-game-1?session=1");
    const strip = page.locator(".journey-history-strip");
    await expect(strip).toBeVisible({ timeout: 20_000 });
    await expect(strip).toContainText("Primeira run");
    await expect(strip).toContainText("New Game+");
    // Each row says how much is in it, which is what makes the list worth
    // reading rather than a set of names.
    await expect(strip).toContainText("2 registros");
    await expect(strip).toContainText("1 registro");
  });

  test("picking a journey opens its diary", async ({ page, context }) => {
    const owner = await ready(context, "pick");
    await giveJourney(owner, {
      game: 1,
      title: "Primeira run",
      sessions: [{ daysAgo: 12, minutes: 95 }],
    });

    await page.goto("/pt-BR/game/e2e-game-1?session=1");
    await expect(page.locator(".journey-history-strip")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: /abrir o diário/i }).click();

    // The work step: the journey is named, and the calendar is there to
    // write into.
    await expect(page.locator(".journey-overview")).toBeVisible();
    await expect(page.locator(".journey-overview")).toContainText(
      "Primeira run",
    );
    await expect(
      page.getByRole("button", { name: /trocar jornada/i }),
    ).toBeVisible();
  });

  test("a new journey can be named and becomes the one being written to", async ({
    page,
    context,
  }) => {
    await ready(context, "create");

    await page.goto("/pt-BR/game/e2e-game-1?session=1");
    const dialog = page.locator(".social-editor-dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    // With no journeys yet the naming field is already open.
    const field = dialog.getByRole("textbox").first();
    await expect(field).toBeVisible();
    await field.fill("Primeira tentativa");
    await dialog
      .getByRole("button", { name: /criar|salvar/i })
      .first()
      .click();

    await expect(page.locator(".journey-overview")).toContainText(
      "Primeira tentativa",
      { timeout: 15_000 },
    );
  });

  test("the summary tiles say their whole value", async ({ page, context }) => {
    const owner = await ready(context, "tiles");
    await giveJourney(owner, {
      game: 1,
      title: "Primeira run",
      // No explicit start mark, so the first session's own date fills the
      // tile: that is the long form that used to overflow it.
      sessions: [
        { daysAgo: 12, minutes: 95 },
        { daysAgo: 5, minutes: 140 },
      ],
    });

    await page.goto("/pt-BR/game/e2e-game-1?session=1");
    await expect(page.locator(".journey-history-strip")).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: /abrir o diário/i }).click();
    await expect(page.locator(".journey-overview")).toBeVisible();

    // A date carrying its year in a tile a fifth of the row wide is a date
    // that ends in an ellipsis.
    const cut = await page.evaluate(() => {
      const tiles = Array.from(
        document.querySelectorAll<HTMLElement>(".journey-overview dd"),
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
