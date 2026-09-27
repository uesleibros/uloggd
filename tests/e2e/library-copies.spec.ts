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
 * The library, counted by copy instead of by game.
 *
 * The other view answers "which games are mine". This one answers the
 * questions about the same shelf that it cannot: what do I have physically,
 * what is on Steam, what am I only renting, and which games do I own twice.
 * A game appears once there per copy, which is why the two are separate
 * views: the count of games has to keep meaning games.
 */
test.describe("the copies view", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(120_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("filters by platform, medium, ownership and storefront", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("copyview");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
    ]);

    const copies = [
      {
        game: 1,
        platform_id: 167,
        platform_name: "PlayStation 5",
        medium: "DIGITAL",
        ownership: "SUBSCRIPTION",
        storefront: "PLAYSTATION",
      },
      {
        game: 1,
        platform_id: 6,
        platform_name: "PC",
        medium: "DIGITAL",
        ownership: "OWNED",
        storefront: "STEAM",
      },
      {
        game: 2,
        platform_id: 130,
        platform_name: "Nintendo Switch",
        medium: "PHYSICAL",
        ownership: "OWNED",
        storefront: "RETAIL",
      },
    ];
    for (const { game, ...copy } of copies) {
      const made = await context.request.post("/api/v1/library/copies", {
        data: {
          igdb_id: 900_000 + game,
          game_slug: `e2e-game-${game}`,
          ...copy,
        },
      });
      expect(made.status(), await made.text()).toBe(200);
    }

    await page.goto(`/pt-BR/library/${owner.username}`);
    const views = page.locator(".library-views");
    await views.getByRole("button", { name: "Cópias" }).click();

    const rows = page.locator(".library-copies-list li");
    await expect(rows).toHaveCount(3, { timeout: 30_000 });
    // Three copies of two games, and one of those games twice.
    await expect(page.locator(".library-copies header")).toContainText(
      "3 cópias de 2 jogos",
    );
    await expect(page.locator(".library-copies header")).toContainText(
      "1 em mais de uma plataforma",
    );

    // Físico: one row, the Switch copy.
    await page.getByRole("button", { name: /^Físico/ }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Nintendo Switch");
    await page.getByRole("button", { name: /^Físico/ }).click();
    await expect(rows).toHaveCount(3);

    // Steam: the PC copy of the first game.
    await page.getByRole("button", { name: /^Steam/ }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("E2E Game 01");

    // And the games view is still about games: two of them, not three.
    await views.getByRole("button", { name: "Jogos" }).click();
    await expect(page.locator(".library-copies")).toHaveCount(0);
  });
});
