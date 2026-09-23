import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * Ticking a game off a list.
 *
 * A list is often a plan ("games to finish in 2026"), and the tick is the
 * progress through it: the game fades, keeps a check, and the list says how
 * far along it is. The mark belongs to the list, so a reader of somebody
 * else's sees the ticks and cannot change them, and the same game ticked here
 * is untouched in another list.
 */
test.describe("marking games in a list", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("the owner ticks one off and everybody sees it", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("listmark");
    accounts.push(owner);
    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();

    const made = await page.request.post("/api/v1/lists", {
      data: { name: "Zerados 2026", visibility: "PUBLIC" },
    });
    expect(made.status(), await made.text()).toBe(201);
    const listId = (await made.json()).data.public_id as string;
    for (const game of [1, 2]) {
      const added = await page.request.post(`/api/v1/lists/${listId}/items`, {
        data: { igdb_id: 900_000 + game, game_slug: `e2e-game-${game}` },
      });
      expect(added.status(), await added.text()).toBe(201);
    }

    await page.goto(`/pt-BR/lists/${listId}?edit=1`);
    const items = page.locator(".ranked-list-item");
    await expect(items).toHaveCount(2);
    await expect(page.locator(".list-mark-progress")).toHaveCount(0);

    // The tick shows at once and is written behind it, so the write is what
    // the reload below has to wait for.
    const written = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await items.first().locator(".list-item-mark").click();
    await expect(items.first()).toHaveAttribute("data-marked", "true");
    await expect(page.locator(".list-mark-progress")).toHaveText(
      /1 de 2 concluídos/,
    );
    expect((await written).status()).toBe(200);

    // Written, not only on screen: the same page read again still has it.
    await page.reload();
    await expect(page.locator(".ranked-list-item[data-marked]")).toHaveCount(1);

    // A reader sees the tick and has no button to change it.
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(`/pt-BR/lists/${listId}`);
    await expect(
      strangerPage.locator(".ranked-list-item[data-marked]"),
    ).toHaveCount(1);
    await expect(strangerPage.locator(".list-item-marked")).toHaveCount(1);
    await expect(strangerPage.locator(".list-item-mark")).toHaveCount(0);
    await expect(strangerPage.locator(".list-mark-progress")).toHaveText(
      /1 de 2 concluídos/,
    );
    await stranger.close();

    // And it comes back off.
    const cleared = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await items.first().locator(".list-item-mark").click();
    expect((await cleared).status()).toBe(200);
    await expect(page.locator(".ranked-list-item[data-marked]")).toHaveCount(0);
    await expect(page.locator(".list-mark-progress")).toHaveCount(0);
    await context.close();
  });

  test("a reader cannot tick somebody else's list", async ({ browser }) => {
    const owner = await createAccount("markowner");
    const reader = await createAccount("markreader");
    accounts.push(owner, reader);
    const ownerContext = await browser.newContext();
    await signIn(ownerContext, owner);
    const made = await ownerContext.request.post("/api/v1/lists", {
      data: { name: "Somebody else's plan", visibility: "PUBLIC" },
    });
    const listId = (await made.json()).data.public_id as string;
    const added = await ownerContext.request.post(
      `/api/v1/lists/${listId}/items`,
      { data: { igdb_id: 900_001, game_slug: "e2e-game-1" } },
    );
    const itemId = (await added.json()).data.id as string;
    await ownerContext.close();

    const readerContext = await browser.newContext();
    await signIn(readerContext, reader);
    const refused = await readerContext.request.patch(
      `/api/v1/lists/${listId}/items/${itemId}`,
      { data: { marked: true } },
    );
    expect(refused.status()).toBeGreaterThanOrEqual(400);
    await readerContext.close();
  });
});
