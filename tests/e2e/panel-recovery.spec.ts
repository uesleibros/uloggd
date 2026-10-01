import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("panels recover without a document reload", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });

  test("home distinguishes failed recommendations and library reads from empty data", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("homerecovery");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const game = (
      await (await context.request.get("/api/igdb/search?ids=900001")).json()
    ).results[0];
    const failures = new Set(["library", "people", "history"]);
    let cardsFail = true;
    let documents = 0;
    page.on("request", (request) => {
      if (
        request.resourceType() === "document" &&
        request.frame() === page.mainFrame()
      )
        documents += 1;
    });
    await page.route("**/api/v1/discovery/*", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1)!;
      if (failures.has(name))
        await route.fulfill({
          status: 503,
          json: { error: { code: "unavailable", message: "Unavailable" } },
        });
      else if (name === "history")
        await route.fulfill({
          json: { data: { recentlyViewed: [game], forYou: [] } },
        });
      else await route.continue();
    });
    await page.route("**/api/v1/library/cards?ids=900001", async (route) => {
      if (cardsFail)
        await route.fulfill({
          status: 503,
          json: { error: { code: "unavailable", message: "Unavailable" } },
        });
      else await route.continue();
    });
    await page.goto("/pt-BR");
    const library = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar a sua biblioteca." });
    const people = page.getByRole("alert").filter({
      hasText: "Não foi possível carregar os amigos e as recomendações.",
    });
    const history = page.getByRole("alert").filter({
      hasText: "Não foi possível carregar o histórico e as recomendações.",
    });
    for (const panel of [library, people, history])
      await expect(panel).toBeVisible();
    failures.delete("library");
    await library.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(
      page.getByRole("heading", { name: "Continuar jogando" }),
    ).toBeVisible();
    await expect(library).toBeHidden();
    failures.delete("people");
    const peopleLoaded = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/discovery/people") &&
        response.status() === 200,
    );
    await people.getByRole("button", { name: "Tentar de novo" }).click();
    await peopleLoaded;
    await expect(people).toBeHidden();
    failures.delete("history");
    await history.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(
      page
        .locator(".home-catalog-shelf")
        .filter({
          has: page.getByRole("heading", {
            name: "Vistos recentemente",
            exact: true,
          }),
        })
        .getByRole("link", { name: "E2E Game 01", exact: true }),
    ).toBeVisible();
    await expect(history).toBeHidden();
    const cards = page.getByRole("alert").filter({
      hasText: "Não foi possível carregar os seus dados dos jogos.",
    });
    await expect(cards).toBeVisible();
    cardsFail = false;
    const cardsLoaded = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/library/cards?ids=900001") &&
        response.status() === 200,
    );
    await cards.getByRole("button", { name: "Tentar de novo" }).click();
    await cardsLoaded;
    await expect(cards).toBeHidden();
    expect(documents).toBe(1);
  });

  test("tier lists retry editing and retain the latest board and updated cover", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("tiercovery");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const created = await context.request.post("/api/v1/lists", {
      data: { name: "Recover this tier list", kind: "TIERLIST" },
    });
    expect(created.status(), await created.text()).toBe(201);
    const list = (await created.json()).data;
    const initial = (
      await (await context.request.get(`/api/v1/lists/${list.id}/tiers`)).json()
    ).data;
    const saved = await context.request.put(`/api/v1/lists/${list.id}/tiers`, {
      data: {
        tiers: initial.tiers,
        items: [
          {
            tier_id: initial.tiers[0].id,
            igdb_id: 900001,
            game_slug: "e2e-game-1",
            position: 0,
          },
        ],
      },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    let editorFails = true;
    let boardFails = false;
    let failureStatus = 503;
    let holdBoard: Promise<void> | null = null;
    let boardRequested: (() => void) | null = null;
    let revision = 1;
    await page.route(`**/api/v1/lists/${list.id}/tiers?**`, async (route) => {
      const editing =
        new URL(route.request().url()).searchParams.get("pool") === "1";
      if (!editing && holdBoard) {
        boardRequested?.();
        await holdBoard;
      }
      if (editing ? editorFails : boardFails) {
        await route.fulfill({
          status: failureStatus,
          json: { error: { code: "unavailable", message: "Unavailable" } },
        });
        return;
      }
      const response = await route.fetch();
      const payload = await response.json();
      if (!editing) {
        payload.data.tiers[0].label =
          revision === 1 ? "Último salvo" : "Atualizado";
        payload.data.items[0].coverUrl =
          revision === 1 ? "/e2e-missing-cover.jpg" : "/logo.jpg?revision=2";
        payload.data.items[0].fallbackUrl = "/logo.jpg";
      }
      await route.fulfill({ response, json: payload });
    });
    await page.goto(`/pt-BR/lists/${list.public_id}`);
    const modes = page.locator(".list-view-mode:visible");
    const board = page.locator(".tierlist-board:not([aria-busy]):visible");
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar" });
    await expect(board.locator(".tierlist-row-label").first()).toHaveText(
      initial.tiers[0].label,
    );
    await modes.getByRole("link", { name: "Editar", exact: true }).click();
    await expect(alert).toBeVisible();
    await expect(
      page.locator('.tierlist-board[aria-busy="true"]:visible'),
    ).toHaveCount(0);
    editorFails = false;
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(page.locator(".tierlist-editor:visible")).toBeVisible();
    await modes.getByRole("link", { name: "Visualizar", exact: true }).click();
    await expect(board.locator(".tierlist-row-label").first()).toHaveText(
      "Último salvo",
    );
    await expect(board.locator("img")).toHaveAttribute("src", /\/logo\.jpg$/);
    await modes.getByRole("link", { name: "Editar", exact: true }).click();
    await expect(page.locator(".tierlist-editor:visible")).toBeVisible();
    boardFails = true;
    await modes.getByRole("link", { name: "Visualizar", exact: true }).click();
    await expect(alert).toBeVisible();
    await expect(board.locator(".tierlist-row-label").first()).toHaveText(
      "Último salvo",
    );
    await expect(board.locator("img")).toHaveAttribute("src", /\/logo\.jpg$/);
    // Retrying updates the existing image instance, after its previous source
    // failed. A sticky failure boolean would keep showing the old fallback.
    boardFails = false;
    revision = 2;
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(board.locator(".tierlist-row-label").first()).toHaveText(
      "Atualizado",
    );
    await expect(board.locator("img")).toHaveAttribute(
      "src",
      /\/logo\.jpg\?revision=2$/,
    );
    await expect
      .poll(() =>
        board
          .locator("img")
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(alert).toBeHidden();
    await modes.getByRole("link", { name: "Editar", exact: true }).click();
    await expect(page.locator(".tierlist-editor:visible")).toBeVisible();
    boardFails = true;
    failureStatus = 403;
    await modes.getByRole("link", { name: "Visualizar", exact: true }).click();
    await expect(alert).toBeVisible();
    await expect(board).toHaveCount(0);
    let release!: () => void;
    holdBoard = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      boardRequested = resolve;
    });
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await requested;
    await expect(board).toHaveCount(0);
    boardFails = false;
    release();
    await expect(board.locator(".tierlist-row-label").first()).toHaveText(
      "Atualizado",
    );
  });

  test("an empty tier list is only declared empty after its read succeeds", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("emptytier");
    accounts.push(owner);
    await signIn(context, owner);
    const created = await context.request.post("/api/v1/lists", {
      data: { name: "Empty after confirmation", kind: "TIERLIST" },
    });
    expect(created.status(), await created.text()).toBe(201);
    const list = (await created.json()).data;
    let failed = true;
    await page.route(`**/api/v1/lists/${list.id}/tiers?**`, async (route) => {
      if (failed)
        await route.fulfill({
          status: 503,
          json: { error: { code: "unavailable", message: "Unavailable" } },
        });
      else await route.continue();
    });
    await page.goto(`/pt-BR/lists/${list.public_id}?edit=1`);
    await expect(page.locator(".tierlist-editor:visible")).toBeVisible();
    await page
      .locator(".list-view-mode:visible")
      .getByRole("link", { name: "Visualizar", exact: true })
      .click();
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar" });
    await expect(alert).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tierlist vazia" }),
    ).toBeHidden();
    failed = false;
    await alert.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(
      page.getByRole("heading", { name: "Tierlist vazia" }),
    ).toBeVisible();
    await expect(alert).toBeHidden();
  });
});
