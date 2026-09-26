import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * What the panel on a game page can say about a game.
 *
 * Two bugs live here, both of the same shape: a control that assumed the game
 * was already in the library, or that one fact about it was really another.
 * Neither account here is given a library, on purpose. Arriving at a game
 * page having never tracked anything is the ordinary case, and it is where
 * both of them went wrong.
 */
test.describe("game state", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  async function ready(context: Parameters<typeof signIn>[0], label: string) {
    const owner = await createAccount(label);
    accounts.push(owner);
    await signIn(context, owner);
    return owner;
  }

  test("playing and played are two separate things", async ({
    page,
    context,
  }) => {
    await ready(context, "states");
    await page.goto("/pt-BR/game/e2e-game-1");

    const playing = page.locator('button[data-action="playing"]');
    await expect(playing).toBeVisible({ timeout: 25_000 });
    await playing.click();
    await expect(playing).toHaveAttribute("aria-pressed", "true");

    // Marking it played used to switch "Jogando" off, because the button read
    // the status instead of the flag beside it.
    await page.locator("button.game-status-button").click();
    await page.getByRole("menuitem", { name: "Jogado" }).click();
    await expect(page.locator("button.game-status-button")).toContainText(
      "Jogado",
      { timeout: 20_000 },
    );
    await expect(playing).toHaveAttribute("aria-pressed", "true");

    // And it survives a reload, which is the difference between the button
    // lying and the row saying both.
    await page.reload();
    await expect(page.locator('button[data-action="playing"]')).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 25_000 },
    );
    await expect(page.locator("button.game-status-button")).toContainText(
      "Jogado",
    );
  });

  test("a cover can be chosen for a game you never tracked", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    await ready(context, "cover");
    // Through the API rather than the picker: the stub catalogue gives this
    // game one cover, so there is nothing to choose between on screen, and
    // the bug was in the door the picker knocks on. It answered "that game is
    // not in your library" for a game nobody had added, which is every game
    // the first time somebody wants it to look different.
    await page.goto("/pt-BR/game/e2e-game-1");
    // The browser's own request, so it carries the session cookie the sign-in
    // put on this context.
    const response = await context.request.post("/api/v1/library", {
      data: {
        igdb_id: 900001,
        game_slug: "e2e-game-1",
        cover_url:
          "https://images.igdb.com/igdb/image/upload/t_cover_big/co2l7a.jpg",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.custom_cover_url).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co2l7a.jpg",
    );
  });
});
