import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  giveLibrary,
  type TestAccount,
} from "./fixtures/account";
import type { AwardAnswer } from "../../lib/awards";

test.describe("custom game awards", () => {
  test.skip(!canSignIn, "needs Supabase credentials");
  test.setTimeout(120_000);
  let owner: TestAccount;
  test.beforeEach(async ({ context }) => {
    owner = await createAccount("awards");
    await signIn(context, owner);
  });
  test.afterEach(async () => {
    if (owner) await destroyAccount(owner);
  });

  test("loading grid stays visible until the response and an API error has an immediate retry", async ({
    page,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/awards?*", async (route) => {
      await gate;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "service_unavailable", message: "Unavailable" },
        }),
      });
    });
    await page.goto("/pt-BR/awards");
    await expect(page.locator("[data-awards-skeleton]")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/awards-loading-${test.info().project.name}.png`,
    });
    release();
    await expect(page.locator("[data-awards-skeleton]")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Tentar de novo", exact: true }),
    ).toBeVisible();
  });

  test("create, customize, publish and share an edition", async ({
    page,
    context,
    browser,
  }) => {
    await giveLibrary(owner, [
      { game: 1, status: "COMPLETED" },
      { game: 2, status: "PLAYING" },
    ]);
    await page.goto("/pt-BR/awards");
    await expect(
      page.getByRole("button", { name: "Minhas premiações", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("button", { name: "Nova premiação", exact: true })
      .click();
    const create = page.getByRole("dialog", {
      name: "Nova premiação",
      exact: true,
    });
    await expect(
      create.getByLabel("Nome da premiação", { exact: true }),
    ).toHaveAttribute("placeholder", "Ex.: Meus jogos do ano");
    await create
      .getByRole("combobox", { name: "Objetivo", exact: true })
      .click();
    const selected = page.getByRole("option", {
      name: "Meus vencedores",
      exact: true,
    });
    await expect(selected).toBeVisible();
    expect(
      await selected.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
    ).toBe(2);
    await selected.click();
    await create
      .getByLabel("Nome da premiação", { exact: true })
      .fill("My test awards");
    await create
      .getByRole("combobox", { name: "Modelo inicial", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Começar do zero", exact: true })
      .click();
    await create
      .getByRole("button", { name: "Criar rascunho", exact: true })
      .click();
    await expect(page).toHaveURL(/\/awards\/[a-zA-Z0-9]+\?edit=1/);
    await expect(page.locator(".awards-category")).toHaveCount(1);
    await page
      .getByLabel("Nome da categoria", { exact: true })
      .fill("Favorite story");
    await page
      .getByRole("button", { name: "Adicionar indicado", exact: true })
      .click();
    const picker = page.getByRole("dialog", {
      name: "Escolher indicados",
      exact: true,
    });
    await picker
      .getByRole("button", { name: "Indicar E2E Game 01", exact: true })
      .click();
    await picker.getByRole("button", { name: "Fechar", exact: true }).click();
    await page
      .getByRole("button", { name: "Vencedor: E2E Game 01", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publicar edição", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Editar", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".awards-winner")).toHaveText("Vencedor");
    const pathname = new URL(page.url()).pathname;
    const anonymous = await browser.newContext({
      baseURL: "http://localhost:3100",
    });
    try {
      const shared = await anonymous.newPage();
      await shared.goto(pathname);
      await expect(
        shared.getByRole("heading", { name: "My test awards", exact: true }),
      ).toBeVisible();
      await expect(
        shared.getByRole("heading", { name: "Favorite story", exact: true }),
      ).toBeVisible();
      await expect(shared.locator(".awards-winner")).toBeVisible();
      expect(
        await shared
          .locator(".awards-game-name")
          .evaluate((el) => getComputedStyle(el).textDecorationLine),
      ).toBe("none");
      expect(
        await shared
          .locator(".awards-back")
          .evaluate((el) => getComputedStyle(el).textDecorationLine),
      ).toBe("none");
      await expect(
        shared.getByRole("button", { name: "Editar", exact: true }),
      ).toHaveCount(0);
      await shared.screenshot({
        path: `test-results/awards-${test.info().project.name}.png`,
        fullPage: true,
      });
      expect(
        await shared.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    } finally {
      await anonymous.close();
    }
    const read = await context.request.get(
      `/api/v1/awards/${pathname.split("/").at(-1)}`,
    );
    expect(read.ok()).toBe(true);
  });

  test("source lists restrict choices live; drafts and private pools stay private", async ({
    page,
    context,
    browser,
  }) => {
    const madeList = await context.request.post("/api/v1/lists", {
      data: { name: "2026 playing", visibility: "PRIVATE" },
    });
    expect(madeList.ok(), await madeList.text()).toBe(true);
    const list = (await madeList.json()).data;
    const item = await context.request.post(`/api/v1/lists/${list.id}/items`, {
      data: { igdb_id: 900001, game_slug: "e2e-game-1" },
    });
    expect(item.ok()).toBe(true);
    const itemId = (await item.json()).data.id;
    const doc = {
      name: "Live list awards",
      year: 2026,
      mode: "PREDICTIONS",
      rules: "Only games from my source list",
      source: "LIST",
      source_list_id: list.id,
      visibility: "PUBLIC",
      status: "DRAFT",
      categories: [
        {
          id: randomUUID(),
          name: "Best game",
          description: "",
          max_nominees: 2,
          nominees: [900001],
          winner: 900001,
        },
      ],
    };
    const made = await context.request.post("/api/v1/awards", { data: doc });
    expect(made.ok(), await made.text()).toBe(true);
    const award = (await made.json()).data;
    const anonymous = await browser.newContext({
      baseURL: "http://localhost:3100",
    });
    try {
      expect(
        (
          await anonymous.request.get(`/api/v1/awards/${award.public_id}`)
        ).status(),
      ).toBe(404);
      const invalid = await context.request.patch(
        `/api/v1/awards/${award.public_id}`,
        {
          data: {
            ...doc,
            version: award.version,
            categories: [
              { ...doc.categories[0], nominees: [900002], winner: 900002 },
            ],
          },
        },
      );
      expect(invalid.status()).toBe(400);
      const eligible = await context.request.get(
        `/api/v1/awards/${award.public_id}/eligible?q=e2e`,
      );
      expect(eligible.ok(), await eligible.text()).toBe(true);
      expect(
        (await eligible.json()).data.map((g: { id: number }) => g.id),
      ).toEqual([900001]);
      const published = await context.request.patch(
        `/api/v1/awards/${award.public_id}`,
        { data: { ...doc, status: "PUBLISHED", version: award.version } },
      );
      expect(published.ok(), await published.text()).toBe(true);
      const stale = await context.request.patch(
        `/api/v1/awards/${award.public_id}`,
        { data: { ...doc, version: award.version } },
      );
      expect(stale.status()).toBe(409);
      expect(
        (
          await anonymous.request.get(
            `/api/v1/awards/${award.public_id}/eligible`,
          )
        ).status(),
      ).toBe(401);
      await page.goto(`/pt-BR/awards/${award.public_id}?edit=1`);
      await page
        .getByRole("button", { name: "Adicionar indicado", exact: true })
        .click();
      const picker = page.getByRole("dialog", {
        name: "Escolher indicados",
        exact: true,
      });
      await expect(picker).toContainText("Somente os jogos permitidos");
      await expect(
        picker.getByRole("button", { name: /Indicar E2E Game 02/ }),
      ).toHaveCount(0);
      await picker.getByRole("button", { name: "Fechar", exact: true }).click();
      const removed = await context.request.delete(
        `/api/v1/lists/${list.id}/items/${itemId}`,
      );
      expect(removed.ok(), await removed.text()).toBe(true);
      const live = await anonymous.request.get(
        `/api/v1/awards/${award.public_id}`,
      );
      expect(live.ok(), await live.text()).toBe(true);
      const answer = (await live.json()) as AwardAnswer;
      expect(answer.data.categories[0].nominees).toEqual([]);
      expect(answer.data.categories[0].winner).toBeNull();
      expect(answer.source_list).toBeNull();
      await page.reload();
      await expect(
        page.getByRole("status").filter({ hasText: "não pertencem mais" }),
      ).toBeVisible();
    } finally {
      await anonymous.close();
    }
  });
});
