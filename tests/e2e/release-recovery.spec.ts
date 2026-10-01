import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  giveJourney,
  giveScreenshot,
  signIn,
  type TestAccount,
} from "./fixtures/account";

test.describe("release recovery", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });

  test("sensitive session actions reject a different origin", async ({
    context,
  }) => {
    const owner = await createAccount("rcorigin");
    accounts.push(owner);
    await signIn(context, owner);
    const headers = { origin: "https://another-site.example" };
    const deletion = await context.request.delete("/api/account", {
      headers,
      data: { confirmation: `@${owner.username}` },
    });
    expect(deletion.status()).toBe(403);
    expect((await deletion.json()).error).toBe("invalid_origin");
    const moderation = await context.request.post("/api/moderation", {
      headers,
      data: { do: "search", term: owner.username },
    });
    expect(moderation.status()).toBe(403);
    expect((await moderation.json()).error).toBe("invalid_origin");
    const profile = await context.request.get("/api/v1/profile");
    expect(profile.status()).toBe(200);
  });

  test("list filters retry failures, keep confirmed content and restore browser history", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rclists");
    accounts.push(owner);
    await signIn(context, owner);
    const created = await context.request.post("/api/v1/lists", {
      data: { name: "Persona confirmed", kind: "COLLECTION" },
    });
    expect(created.status()).toBe(201);
    let fail = true;
    await page.route("**/api/lists?**", async (route) => {
      if (fail)
        await route.fulfill({ status: 503, json: { error: "unavailable" } });
      else await route.continue();
    });
    await page.goto(`/pt-BR/lists/${owner.username}`);
    const card = page
      .locator(".list-preview:visible")
      .filter({ hasText: "Persona confirmed" });
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    const query = page.getByRole("textbox", { name: "Buscar nas suas listas" });
    await query.fill("persona");
    const failure = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível carregar as listas" });
    await expect(failure).toBeVisible();
    await expect(card).toBeVisible();
    await expect(
      page.getByText("Nenhuma lista corresponde a este filtro."),
    ).toBeHidden();
    fail = false;
    await failure.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(failure).toBeHidden();
    await expect(card).toBeVisible();
    await query.fill("missing-list");
    await expect(
      page.getByText("Nenhuma lista corresponde a este filtro."),
    ).toBeVisible();
    await page.goBack();
    await expect(query).toHaveValue("persona");
    await expect(card).toBeVisible();
    await page.goForward();
    await expect(query).toHaveValue("missing-list");
    await expect(
      page.getByText("Nenhuma lista corresponde a este filtro."),
    ).toBeVisible();
  });

  test("a failed session read recovers and session notes reach another tab", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rctabs");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const opened = await context.request.post("/api/v1/journal/sessions", {
      data: { igdb_id: 900001, game_slug: "e2e-game-1" },
    });
    expect(opened.status()).toBe(201);
    let fail = true;
    await page.route("**/api/v1/journal/sessions", async (route) => {
      if (fail && route.request().method() === "GET")
        await route.fulfill({
          status: 503,
          json: { error: { code: "unavailable", message: "Unavailable" } },
        });
      else await route.continue();
    });
    await page.goto("/pt-BR/search");
    const failure = page.locator(".play-bar-read-error").getByRole("alert");
    await expect(failure).toBeVisible();
    fail = false;
    await failure.getByRole("button", { name: "Tentar de novo" }).click();
    const bar = page.locator(".play-bar");
    await expect(bar).toContainText("E2E Game 01");
    const other = await context.newPage();
    await other.goto("/pt-BR/search");
    const otherBar = other.locator(".play-bar");
    await expect(otherBar).toContainText("E2E Game 01");
    await otherBar.locator(".play-bar-identity").click();
    const draft = otherBar.locator('.play-bar-add input[type="text"]');
    await draft.fill("rascunho preservado");
    await bar.locator(".play-bar-identity").click();
    await bar
      .locator('.play-bar-add input[type="text"]')
      .fill("nota da outra aba");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(otherBar.locator(".play-bar-events")).toContainText(
      "nota da outra aba",
    );
    await expect(draft).toHaveValue("rascunho preservado");
    await context.setOffline(true);
    await context.setOffline(false);
    await expect(otherBar).toContainText("nota da outra aba");
    await expect(draft).toHaveValue("rascunho preservado");
    await other.close();
  });

  test("a failed screenshot deletion unlocks the control for another attempt", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rcdelete");
    accounts.push(owner);
    await giveScreenshot(owner, { game: 1, description: "Delete recovery" });
    await signIn(context, owner);
    let fail = true;
    await page.route("**/api/screenshots?id=*", async (route) => {
      if (fail && route.request().method() === "DELETE")
        await route.abort("failed");
      else await route.continue();
    });
    await page.goto(`/pt-BR/shots/${owner.username}`);
    const remove = page.getByRole("button", { name: "Remover captura" });
    await expect(remove).toBeVisible();
    await remove.click();
    await remove.click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Não foi possível remover a captura" }),
    ).toBeVisible();
    await expect(remove).toBeEnabled();
    fail = false;
    await remove.click();
    await remove.click();
    await expect(remove).toHaveCount(0);
  });

  test("a session refresh cannot overwrite a note confirmed while its old response was held", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rcstaleplay");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);
    const opened = await context.request.post("/api/v1/journal/sessions", {
      data: { igdb_id: 900001, game_slug: "e2e-game-1" },
    });
    expect(opened.status()).toBe(201);
    await page.goto("/pt-BR/search");
    const bar = page.locator(".play-bar");
    await expect(bar).toContainText("E2E Game 01");
    await bar.locator(".play-bar-identity").click();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let captured!: () => void;
    const fetched = new Promise<void>((resolve) => {
      captured = resolve;
    });
    await page.route("**/api/v1/journal/sessions", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      captured();
      await held;
      await route.fulfill({ response, json });
    });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await fetched;
    await bar
      .locator('.play-bar-add input[type="text"]')
      .fill("nota confirmada depois da leitura");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(bar.locator(".play-bar-events")).toContainText(
      "nota confirmada depois da leitura",
    );
    release();
    await page.waitForLoadState("networkidle");
    await expect(bar.locator(".play-bar-events")).toContainText(
      "nota confirmada depois da leitura",
    );
  });

  test("a later library page failure keeps its known games without inventing totals", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rcshelf");
    accounts.push(owner);
    await giveLibrary(owner, [
      { game: 1, status: "PLAYING" },
      { game: 2, status: "BACKLOG" },
    ]);
    await signIn(context, owner);
    const response = await context.request.get(
      `/api/v1/profiles/${owner.username}/library?limit=200&page=1&games=1`,
    );
    expect(response.status()).toBe(200);
    const confirmed = await response.json();
    expect(confirmed.data).toHaveLength(2);
    let fail = true;
    await page.route(
      `**/api/v1/profiles/${owner.username}/library?**`,
      async (route) => {
        const pageNumber = new URL(route.request().url()).searchParams.get(
          "page",
        );
        if (pageNumber === "2" && fail) {
          await route.fulfill({
            status: 503,
            json: { error: { code: "unavailable", message: "Unavailable" } },
          });
          return;
        }
        await route.fulfill({
          json: {
            ...confirmed,
            data: [confirmed.data[pageNumber === "2" ? 1 : 0]],
            has_more: pageNumber !== "2",
          },
        });
      },
    );
    await page.goto(`/pt-BR/library/${owner.username}`);
    const failure = page
      .getByRole("alert")
      .filter({ hasText: "o restante desta biblioteca" });
    await expect(failure).toBeVisible();
    await expect(page.locator(".library-hero-stats")).toHaveCount(0);
    await expect(page.locator(".library-results")).toContainText("E2E Game");
    fail = false;
    await failure.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(failure).toBeHidden();
    await expect(page.locator(".library-hero-stats")).toBeVisible();
    await expect(page.locator(".library-hero-stats dd").first()).toHaveText(
      "2",
    );
  });

  test("retrying a partial image upload reuses the saved session and uploaded images", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rcimages");
    accounts.push(owner);
    await giveJourney(owner, {
      game: 1,
      title: "Image recovery",
      sessions: [],
    });
    await signIn(context, owner);
    const ids = [randomUUID(), randomUUID()];
    let uploads = 0;
    let reordered: string[] = [];
    // The upload service is substituted here to exercise a partial transaction.
    // The separate screening specs exercise the real server and upload host.
    await page.route("**/api/journal/images", async (route) => {
      uploads += 1;
      if (uploads === 2)
        await route.fulfill({
          status: 503,
          json: { error: "screening_unavailable" },
        });
      else
        await route.fulfill({
          status: 201,
          json: { id: ids[uploads === 1 ? 0 : 1], url: "/logo.jpg" },
        });
    });
    await page.route("**/api/v1/journal/entries/*", async (route) => {
      const body = route.request().postDataJSON();
      if (body.image_order) {
        reordered = body.image_order;
        await route.fulfill({ json: { data: {} } });
      } else await route.continue();
    });
    await page.goto("/pt-BR/game/e2e-game-1");
    await page.getByRole("button", { name: /Registrar jornada/i }).click();
    const studio = page.locator(".social-editor-dialog:visible");
    await studio
      .locator(".journey-history-strip button")
      .filter({ hasText: "Image recovery" })
      .click();
    await studio
      .locator(".journey-open-day")
      .getByRole("button", { name: "Abrir", exact: true })
      .click();
    await studio
      .getByRole("button", { name: "Registrar esse dia", exact: true })
      .click();
    const editor = studio.locator(".journey-day-editor");
    const image = await readFile("public/logo.jpg");
    await editor.locator('input[type="file"]').setInputFiles([
      { name: "first.jpg", mimeType: "image/jpeg", buffer: image },
      { name: "second.jpg", mimeType: "image/jpeg", buffer: image },
    ]);
    await page.locator(".screening-dialog-close:visible").click();
    await expect(page.locator(".screening-dialog:visible")).toHaveCount(0);
    const save = editor.getByRole("button", {
      name: "Salvar sessão",
      exact: true,
    });
    await save.click();
    await expect(editor).toContainText("verificação");
    await expect(save).toBeEnabled();
    const afterFailure = await context.request.get(
      "/api/v1/journal/entries?igdb_id=900001",
    );
    expect((await afterFailure.json()).data).toHaveLength(1);
    await save.click();
    await expect(editor).toBeHidden();
    expect(uploads).toBe(3);
    expect(reordered).toEqual(ids);
    const afterRetry = await context.request.get(
      "/api/v1/journal/entries?igdb_id=900001",
    );
    expect((await afterRetry.json()).data).toHaveLength(1);
  });

  test("an unavailable image read cannot be saved as an empty gallery", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("rcimageread");
    accounts.push(owner);
    await giveJourney(owner, {
      game: 1,
      title: "Read recovery",
      sessions: [{ daysAgo: 1, note: "A confirmed session" }],
    });
    await signIn(context, owner);
    let fail = true;
    await page.route("**/api/journal/images?entry=*", async (route) => {
      if (fail)
        await route.fulfill({ status: 503, json: { error: "unavailable" } });
      else await route.continue();
    });
    await page.goto("/pt-BR/game/e2e-game-1");
    await page.getByRole("button", { name: /Registrar jornada/i }).click();
    const studio = page.locator(".social-editor-dialog:visible");
    await studio
      .locator(".journey-history-strip button")
      .filter({ hasText: "Read recovery" })
      .click();
    await studio
      .locator(".journey-open-day input")
      .fill(new Date(Date.now() - 86_400_000).toISOString().slice(0, 10));
    await studio
      .locator(".journey-open-day")
      .getByRole("button", { name: "Abrir", exact: true })
      .click();
    await studio
      .locator(".journey-day-entries button")
      .filter({ hasText: "A confirmed session" })
      .click();
    const editor = studio.locator(".journey-day-editor");
    const images = editor.locator(".journal-images");
    await expect(images.getByRole("alert")).toBeVisible();
    const save = editor.getByRole("button", {
      name: "Salvar sessão",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await expect(images).toContainText("... de 12");
    fail = false;
    await images.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(images.getByRole("alert")).toBeHidden();
    await expect(images).toContainText("0 de 12");
    await expect(save).toBeEnabled();
  });
});
