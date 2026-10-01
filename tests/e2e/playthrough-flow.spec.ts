import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  giveScreenshot,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * The whole of it, once, as one person would do it.
 *
 * Every piece here has its own spec. This is the one that proves they are
 * the same feature: a copy recorded on the game page is the copy a run points
 * at, the run is what the session belongs to, the session's notes are what
 * the entry shows afterwards, and all of it lands in the numbers.
 *
 * It is deliberately long. A flow that only works when each half is tested
 * alone is the failure this exists to catch.
 */
test.describe("a playthrough, end to end", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("copy, run, session, timeline, numbers", async ({ page, context }) => {
    const owner = await createAccount("flow");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);

    await page.goto("/pt-BR/game/e2e-game-1");

    // 1. A copy, with more than the platform on it.
    // Streaming can temporarily retain an inactive server fragment in #S:*.
    // The visible workspace must be unique and behave like the user's page.
    const copies = page.locator(".game-copies:visible");
    await expect(copies).toHaveCount(1, { timeout: 30_000 });
    await expect(copies).toBeVisible({ timeout: 30_000 });
    await copies.locator("header button").click();
    const copyDialog = page.locator(".game-copy-dialog");
    await expect(copyDialog).toBeVisible();
    await copyDialog.locator(".editor-select-trigger").first().click();
    await page.getByRole("option").first().click();
    await copyDialog.locator(".game-copy-more").click();
    // Medium, then storefront: the two pickers of the first pair.
    await copyDialog.locator(".editor-select-trigger").nth(1).click();
    await page.getByRole("option", { name: "Digital" }).click();
    await copyDialog.locator(".editor-select-trigger").nth(2).click();
    await page.getByRole("option", { name: "Steam" }).click();
    await copyDialog.getByRole("button", { name: "Salvar" }).click();
    await expect(copyDialog).toBeHidden({ timeout: 20_000 });
    await expect(copies.locator("li")).toHaveCount(1);
    await expect(copies.locator("li")).toContainText("Digital");

    // 2. A run of this game, made from the composer.
    await page.getByRole("button", { name: /Registrar jornada/i }).click();
    const studio = page.locator(".social-editor-dialog");
    await expect(studio).toBeVisible({ timeout: 20_000 });
    // The composer opens on the naming step when there is no journey yet.
    const naming = studio.locator('input[placeholder*="Primeira campanha"]');
    await expect(naming).toBeVisible({ timeout: 20_000 });
    await naming.fill("Primeira run");
    await studio.getByRole("button", { name: "Criar" }).click();
    // Creating it moves the composer on to that journey's diary, which is
    // where somebody would carry on. Nothing to log here: the session is
    // about to write it.
    await expect(studio).toContainText("Primeira run", { timeout: 25_000 });
    await studio.getByRole("button", { name: "Concluído" }).click();
    await expect(studio).toBeHidden({ timeout: 20_000 });

    // 3. A session on it, opened with one press.
    await page.getByRole("button", { name: /Jogando agora/i }).click();
    const bar = page.locator(".play-bar");
    await expect(bar).toBeVisible({ timeout: 25_000 });
    await bar.locator(".play-bar-identity").click();

    // 4. A note, a place, and where they stopped.
    const field = bar.locator('.play-bar-add input[type="text"]');
    await field.fill("a chuva no primeiro mapa");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(bar.locator(".play-bar-events")).toContainText(
      "a chuva no primeiro mapa",
      { timeout: 20_000 },
    );

    await bar.locator(".play-bar-kinds button").nth(1).click();
    await field.fill("capitulo 4");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(bar.locator(".play-bar-events")).toContainText("capitulo 4");

    // 5. A screenshot of the session. The picture itself goes through the
    // screenshot pipeline, which needs an upload host, so the row is seeded
    // and the event is added through the same route the button calls.
    const shot = await giveScreenshot(owner, {
      game: 1,
      description: "da sessao",
      visibility: "PUBLIC",
    });
    const sessionId = await page.evaluate(async () => {
      const answer = await fetch("/api/v1/journal/sessions").then((response) =>
        response.json(),
      );
      return answer.data?.id as string;
    });
    const added = await context.request.post(
      `/api/v1/journal/sessions/${sessionId}/events`,
      { data: { kind: "SHOT", screenshot_id: shot.id } },
    );
    expect(added.status()).toBe(201);

    await bar.locator(".play-bar-kinds button").nth(2).click();
    await field.fill("antes do chefe da torre");
    await bar.locator('.play-bar-add button[type="submit"]').click();
    await expect(bar.locator(".play-bar-events")).toContainText(
      "antes do chefe da torre",
    );

    // 6. Closing turns it into an entry.
    await page.locator(".play-bar-stop").click();
    const closing = page.locator(".play-close-dialog");
    await expect(closing).toBeVisible();
    await closing.locator('input[type="number"]').fill("95");
    await closing.locator(".play-close-confirm").click();
    await expect(page.locator(".play-bar")).toHaveCount(0, { timeout: 25_000 });

    // 7. The run says what it was, and the copy is on it.
    await page.goto("/pt-BR/game/e2e-game-1");
    await page.getByRole("link", { name: /Ver registros/ }).click();
    await page.locator('a[href*="/entry/"]').first().click();
    await expect(page.locator(".play-timeline")).toContainText(
      "a chuva no primeiro mapa",
      { timeout: 25_000 },
    );
    await expect(page.locator(".play-timeline")).toContainText("capitulo 4");
    await expect(page.locator(".play-timeline")).toContainText(
      "antes do chefe da torre",
    );

    await page.locator(".review-page-journey").click();
    const facts = page.locator(".journey-facts");
    await expect(facts).toBeVisible({ timeout: 25_000 });
    // The stop moved the run's progress with it, without anybody typing it
    // into the run.
    await expect(facts).toContainText("antes do chefe da torre");

    await facts.locator(".journey-fact-edit").click();
    const details = page.locator(".journey-details-dialog");
    await expect(details).toBeVisible();
    // The copy is one of the options, named the way the card names it.
    await details.locator(".editor-select-trigger").nth(1).click();
    await page.getByRole("option", { name: /Digital/ }).click();
    await details.getByRole("button", { name: "Salvar" }).click();
    await expect(details).toBeHidden({ timeout: 20_000 });
    await expect(page.locator(".journey-facts")).toContainText("Digital", {
      timeout: 25_000,
    });

    // 8. And the numbers know about all of it.
    await page.goto(`/pt-BR/u/${owner.username}/stats`);
    const grid = page.locator(".year-stat-grid");
    await expect(grid).toBeVisible({ timeout: 25_000 });
    await expect(grid).toContainText("1h");
    await expect(page.locator(".year-top-game").first()).toContainText(
      "E2E Game 01",
    );
  });
});
