import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * Painting the items of a list.
 *
 * This used to be a tick that meant "done", which is one meaning out of many:
 * a list here can be games somebody wants to buy, games they recommend, the
 * best of a series, a challenge. So the site offers a colour or a dimming and
 * the author says what it means, in the list's own description.
 *
 * What these prove is exactly that: the treatment is stored, it survives a
 * reload and a reorder, a reader sees it, and nothing anywhere calls it
 * finished or counts how much of the list is "done".
 */
test.describe("painting a list", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(120_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("three items, three treatments, and a reader sees them", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("listmark");
    accounts.push(owner);
    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();

    const made = await page.request.post("/api/v1/lists", {
      data: {
        name: "Da franquia",
        visibility: "PUBLIC",
        description: "Verde = recomendo. Vermelho = não. Cinza = não joguei.",
      },
    });
    expect(made.status(), await made.text()).toBe(201);
    const listId = (await made.json()).data.public_id as string;
    for (const game of [1, 2, 3]) {
      const added = await page.request.post(`/api/v1/lists/${listId}/items`, {
        data: { igdb_id: 900_000 + game, game_slug: `e2e-game-${game}` },
      });
      expect(added.status(), await added.text()).toBe(201);
    }

    await page.goto(`/pt-BR/lists/${listId}?edit=1`);
    const items = page.locator(".ranked-list-item");
    await expect(items).toHaveCount(3, { timeout: 25_000 });

    async function paint(index: number, choose: () => Promise<void>) {
      const written = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
            new URL(response.url()).pathname,
          ),
      );
      await items.nth(index).locator(".list-item-mark").click();
      await choose();
      expect((await written).status()).toBe(200);
    }

    await paint(0, () =>
      page.getByRole("button", { name: "Vermelho" }).click(),
    );
    await paint(1, () => page.getByRole("button", { name: "Verde" }).click());
    await paint(2, () => page.getByRole("button", { name: "Ofuscar" }).click());

    await expect(items.nth(0)).toHaveAttribute("data-mark-color", "RED");
    await expect(items.nth(1)).toHaveAttribute("data-mark-color", "GREEN");
    await expect(items.nth(2)).toHaveAttribute("data-mark", "DIM");

    // Nothing here counts anything, because there is nothing to count: the
    // site does not know what any of those three mean.
    await expect(page.locator(".list-mark-progress")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("concluídos");

    // Written, not only on screen.
    await page.reload();
    await expect(
      page.locator('.ranked-list-item[data-mark-color="RED"]'),
    ).toHaveCount(1, { timeout: 25_000 });
    await expect(
      page.locator('.ranked-list-item[data-mark="DIM"]'),
    ).toHaveCount(1);

    // And it belongs to the item, not to the row it happens to sit in: moving
    // one down takes its colour with it.
    const moved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await page
      .locator(".ranked-list-item")
      .first()
      .getByRole("button", { name: /abaixo|Mover para baixo|down/i })
      .click();
    expect((await moved).status()).toBe(200);
    await page.reload();
    await expect(page.locator(".ranked-list-item").nth(1)).toHaveAttribute(
      "data-mark-color",
      "RED",
      { timeout: 25_000 },
    );

    // A reader sees the treatments and has nothing to change them with.
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(`/pt-BR/lists/${listId}`);
    await expect(
      strangerPage.locator('.ranked-list-item[data-mark-color="RED"]'),
    ).toHaveCount(1, { timeout: 25_000 });
    await expect(
      strangerPage.locator('.ranked-list-item[data-mark-color="GREEN"]'),
    ).toHaveCount(1);
    await expect(
      strangerPage.locator('.ranked-list-item[data-mark="DIM"]'),
    ).toHaveCount(1);
    await expect(strangerPage.locator(".list-item-mark")).toHaveCount(0);
    // The legend is the author's, in the description, and the site never
    // writes one of its own.
    await expect(strangerPage.locator("body")).toContainText(
      "Verde = recomendo",
    );
    await expect(strangerPage.locator("body")).not.toContainText("concluídos");
    await stranger.close();

    // And it comes off.
    const removed = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await page
      .locator('.ranked-list-item[data-mark-color="RED"] .list-item-mark')
      .click();
    await page
      .locator(".list-mark-popover")
      .getByRole("button", { name: "Remover" })
      .click();
    expect((await removed).status()).toBe(200);
    await expect(
      page.locator('.ranked-list-item[data-mark-color="RED"]'),
    ).toHaveCount(0);
    await context.close();
  });

  test("a custom colour survives the picker closing and opens on the last choice", async ({
    browser,
  }) => {
    const owner = await createAccount("listcustommark");
    accounts.push(owner);
    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();
    const made = await page.request.post("/api/v1/lists", {
      data: { name: "Cores próprias", visibility: "PUBLIC" },
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
    await expect(items).toHaveCount(2, { timeout: 25_000 });
    await items.first().locator(".list-item-mark").click();
    await page
      .locator(".list-mark-popover")
      .getByRole("button", { name: "Cor personalizada" })
      .click();
    const firstPicker = items.first().locator(".list-mark-native-color");
    await expect(firstPicker).toBeAttached();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.locator(".list-mark-popover")).toHaveCount(0);

    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await firstPicker.fill("#5e8571");
    expect((await saved).status()).toBe(200);
    await expect(items.first()).toHaveAttribute("data-mark-color", "#5e8571");

    await items.nth(1).locator(".list-item-mark").click();
    await expect(items.nth(1).locator(".list-mark-native-color")).toHaveValue(
      "#5e8571",
    );
    const secondSaved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/api\/v1\/lists\/[^/]+\/items\/[^/]+$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await items.nth(1).locator(".list-mark-native-color").fill("#a44366");
    expect((await secondSaved).status()).toBe(200);
    await page.keyboard.press("Escape");
    await items.first().locator(".list-item-mark").click();
    await expect(items.first().locator(".list-mark-native-color")).toHaveValue(
      "#a44366",
    );
    await expect(items.first()).toHaveAttribute("data-mark-color", "#5e8571");

    await page.reload();
    await expect(items.first()).toHaveAttribute("data-mark-color", "#5e8571", {
      timeout: 25_000,
    });
    await items.first().locator(".list-item-mark").click();
    await expect(items.first().locator(".list-mark-native-color")).toHaveValue(
      "#a44366",
    );
    await context.close();
  });

  test("a description keeps its line breaks, and the byline is not tracked out", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("listtext");
    accounts.push(owner);
    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();
    const made = await context.request.post("/api/v1/lists", {
      data: {
        name: "Do zeldinha",
        visibility: "PUBLIC",
        description: [
          "Minha lista de jogos",
          "",
          "ATENÇÃO: os ofuscados eu já zerei",
        ].join(String.fromCharCode(10)),
      },
    });
    const listId = (await made.json()).data.public_id as string;
    await page.goto(`/pt-BR/lists/${listId}`);

    const description = page.locator(".list-detail-header:visible p").filter({
      hasText: "Minha lista de jogos",
    });
    await expect(description).toHaveCount(1);
    await expect(description).toBeVisible({ timeout: 25_000 });
    // Somebody who pressed enter twice meant it: the paragraph has to keep
    // the break rather than running both sentences together.
    expect(
      await description.evaluate((node) => getComputedStyle(node).whiteSpace),
    ).toMatch(/pre-line|pre-wrap/);
    const boxes = await description.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    expect(boxes).toBeGreaterThan(1);

    // And the author line is a sentence, not a label: the eyebrow's tracking
    // was reaching it because both are spans in the same header.
    const byline = page.locator(".list-detail-author small:visible");
    await expect(byline).toHaveCount(1);
    expect(
      await byline.evaluate((node) => getComputedStyle(node).letterSpacing),
    ).toBe("normal");
    await context.close();
  });

  test("a reader cannot paint somebody else's list", async ({ browser }) => {
    const owner = await createAccount("markowner");
    const reader = await createAccount("markreader");
    accounts.push(owner, reader);
    const ownerContext = await browser.newContext();
    await signIn(ownerContext, owner);
    const made = await ownerContext.request.post("/api/v1/lists", {
      data: { name: "Somebody else's list", visibility: "PUBLIC" },
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
      { data: { mark_mode: "COLOR", mark_color: "RED" } },
    );
    expect(refused.status()).toBeGreaterThanOrEqual(400);
    // And the door that used to exist answers the same way.
    const legacy = await readerContext.request.patch(
      `/api/v1/lists/${listId}/items/${itemId}`,
      { data: { marked: true } },
    );
    expect(legacy.status()).toBeGreaterThanOrEqual(400);
    await readerContext.close();
  });
});
