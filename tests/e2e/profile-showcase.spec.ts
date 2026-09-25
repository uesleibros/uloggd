import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveShowcase,
  type TestAccount,
} from "./fixtures/account";

/**
 * The auto-scrolling grid in a showcase can be opened, not only dragged.
 *
 * The strip took pointer capture the moment a pointer went down on it.
 * Capture sends the click that follows to the element holding it rather than
 * to whatever was under the pointer, so no cover ever received one: every tile
 * could be dragged and none of them went anywhere. Capture is a drag's to
 * take, and a drag is only known once the pointer has moved.
 */
test.describe("a showcase's scrolling game grid", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("a tile opens its game, and a drag opens nothing", async ({
    browser,
  }, testInfo) => {
    // Two routes to compile, an account to make, and a profile that streams:
    // under `next dev` that is more than the default budget.
    test.slow();
    const owner = await createAccount("showcase");
    accounts.push(owner);
    await giveShowcase(owner, "!game:grid-auto(e2e-game-1, e2e-game-2)");

    // Motion off, so the strip holds still while the pointer is aimed at it.
    // What broke was the pointer handling, not the animation; a tile sliding
    // out from under the cursor would only make a passing test flaky.
    // The project's own device carries over: this is a context of its own
    // only so the preference can be set on it.
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    // Visited once first so the destination is ready: under `next dev` the
    // route compiles on its first request, and the wait for that is not a
    // wait for the click.
    await page.goto("/pt-BR/game/e2e-game-1");
    await page.goto(`/pt-BR/u/${owner.username}`);

    const tiles = page.locator(".md-gc-carousel .md-gc-tile");
    await expect(tiles.first()).toBeVisible();

    // Dragged: the strip scrolls and the page stays where it is.
    const box = (await tiles.first().boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, y, { steps: 8 });
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`/u/${owner.username}$`));

    // Clicked: it goes to the game.
    await tiles.first().click();
    await expect(page).toHaveURL(/\/pt-BR\/game\/e2e-game-\d+$/, {
      timeout: 15_000,
    });

    await context.close();
  });
});
