import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";

const menu = (page: import("@playwright/test").Page) =>
  page.getByRole("menu", { name: "Menu de contexto", exact: true });

test("game context menu copies its destination and navigates with the keyboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/pt-BR/search");
  const card = page.locator(".quick-game-card").first();
  const link = card.locator(".quick-game-link");
  const href = await link.getAttribute("href");
  await link.click({ button: "right" });
  await expect(menu(page)).toBeVisible();
  await expect(
    menu(page).getByRole("menuitem", { name: "Abrir jogo", exact: true }),
  ).toBeVisible();
  await expect(
    menu(page).getByRole("menuitem", { name: "Mais ações" }),
  ).toHaveCount(0);
  await menu(page)
    .getByRole("menuitem", { name: "Copiar link", exact: true })
    .click();
  await expect(menu(page)).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(href!);
  await link.focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(link).toBeFocused();
  await page.keyboard.press("Shift+F10");
  await menu(page)
    .getByRole("menuitem", { name: "Abrir jogo", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(href!));
});

test("context menu opens the existing cover viewer and stays inside the viewport", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  const cover = page.getByRole("button", { name: "Ver capa do jogo" });
  await cover.click({ button: "right" });
  await menu(page).getByRole("menuitem", { name: "Ver capa do jogo" }).click();
  await expect(
    page.getByRole("dialog", { name: "E2E Game 01", exact: true }),
  ).toBeVisible();
  await page.locator(".media-lightbox-stage img").click({ button: "right" });
  await expect(
    menu(page).getByRole("menuitem", {
      name: "Abrir imagem original",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    menu(page).getByRole("menuitem", { name: "Ver imagem", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".media-lightbox-stage")).toBeFocused();
  await page.keyboard.press("Escape");
  const viewport = page.viewportSize()!;
  await page.locator(".site-context-area").dispatchEvent("contextmenu", {
    clientX: viewport.width - 2,
    clientY: viewport.height - 2,
  });
  await expect(menu(page)).toBeVisible();
  const box = (await menu(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await page.keyboard.press("Escape");
});

test("text editing menu preserves selection and updates the controlled search field", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/pt-BR/search");
  const input = page.getByRole("textbox", {
    name: "Buscar jogos",
    exact: true,
  });
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible();
  await input.fill("original");
  await input.focus();
  await input.evaluate((node: HTMLInputElement) =>
    node.setSelectionRange(0, 8),
  );
  await page.keyboard.press("Shift+F10");
  await menu(page)
    .getByRole("menuitem", { name: "Copiar texto", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("original");
  await page.evaluate(() => navigator.clipboard.writeText("E2E Game"));
  await input.focus();
  await input.evaluate((node: HTMLInputElement) =>
    node.setSelectionRange(0, 8),
  );
  await page.keyboard.press("Shift+F10");
  await menu(page)
    .getByRole("menuitem", { name: "Colar", exact: true })
    .click();
  await expect(input).toHaveValue("E2E Game");
  await page.locator('.catalog-search-main-form button[type="submit"]').click();
  await expect(page).toHaveURL(/q=E2E\+Game|q=E2E%20Game/);
});

test("game context actions reuse the library write and expose its full actions", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs Supabase keys");
  const account = await createAccount("contextmenu");
  try {
    await signIn(context, account);
    await page.goto("/pt-BR/search");
    const card = page.locator(".quick-game-card").first();
    const link = card.locator(".quick-game-link");
    await link.click({ button: "right" });
    const written = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/library") &&
        response.request().method() === "POST",
    );
    await menu(page)
      .getByRole("menuitem", { name: "Jogado", exact: true })
      .click();
    expect((await written).status()).toBe(200);
    await link.click({ button: "right" });
    await menu(page)
      .getByRole("menuitem", { name: "Mais ações", exact: true })
      .click();
    await expect(
      page.locator('.quick-menu[role="menu"]').first(),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Lista de desejos" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  } finally {
    await destroyAccount(account);
  }
});

test("catalogue and game title text links are underlined before hover in both themes", async ({
  page,
}) => {
  for (const [url, selector] of [
    ["/pt-BR/company/uloggd-e2e", ".publisher-facts dd a"],
    ["/pt-BR/search", ".quick-game-card h3 a"],
  ]) {
    await page.goto(url);
    const link = page.locator(selector).first();
    await expect(link).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      await expect(link).toHaveCSS("text-decoration-line", "underline");
      await link.hover();
      await expect
        .poll(async () => {
          await link.hover();
          return link.evaluate((node) => getComputedStyle(node).color);
        })
        .toBe(theme === "light" ? "rgb(72, 85, 214)" : "rgb(121, 131, 245)");
    }
  }
});

test("long press opens the image context menu without opening the image", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  const cover = page.getByRole("button", { name: "Ver capa do jogo" });
  await cover.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const touch = new Touch({
      identifier: 1,
      target: node,
      clientX: rect.left + 10,
      clientY: rect.top + 10,
    });
    node.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
      }),
    );
  });
  await expect(menu(page)).toBeVisible();
  await expect(
    menu(page).getByRole("menuitem", { name: "Ver capa do jogo" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .locator('button[aria-label="Ver capa do jogo"]')
    .dispatchEvent("touchend", { touches: [], changedTouches: [] });
  await page.keyboard.press("Escape");
});

test("comment context menu copies the comment and keeps author actions private", async ({
  page,
  context,
  browser,
}) => {
  test.skip(!canSignIn, "needs Supabase keys");
  const account = await createAccount("contextcomment");
  const visitor = await browser.newContext();
  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await signIn(context, account);
    const href = `/pt-BR/u/${account.username}`;
    await page.goto(href);
    const consent = page.getByRole("button", {
      name: "Continuar com necessários",
    });
    if (await consent.isVisible()) await consent.click();
    const body = `context comment ${Date.now()}`;
    await page.getByPlaceholder("Adicione algo à conversa…").fill(body);
    await page
      .getByRole("button", { name: /coment/i })
      .first()
      .click();
    const comment = page
      .locator('[data-context-kind="comment"]')
      .filter({ hasText: body })
      .first();
    await expect(
      comment.getByRole("button", { name: "Editar", exact: true }),
    ).toBeVisible();
    await comment.locator("[data-context-text]").click({ button: "right" });
    await expect(
      menu(page).getByRole("menuitem", { name: "Editar", exact: true }),
    ).toBeVisible();
    await expect(
      menu(page).getByRole("menuitem", { name: "Excluir", exact: true }),
    ).toHaveAttribute("data-danger", "true");
    await menu(page)
      .getByRole("menuitem", { name: "Copiar texto", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(body);
    await comment.locator("[data-context-text]").click({ button: "right" });
    await menu(page)
      .getByRole("menuitem", { name: "Copiar link do comentário" })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("#comment-");
    const other = await visitor.newPage();
    await other.goto(`http://localhost:3100${href}`);
    await other.getByText(body, { exact: true }).click({ button: "right" });
    await expect(menu(other)).toBeVisible();
    await expect(
      menu(other).getByRole("menuitem", { name: "Editar", exact: true }),
    ).toHaveCount(0);
    await expect(
      menu(other).getByRole("menuitem", { name: "Excluir", exact: true }),
    ).toHaveCount(0);
  } finally {
    await visitor.close();
    await destroyAccount(account);
  }
});
