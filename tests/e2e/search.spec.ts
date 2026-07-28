import { expect, test } from "@playwright/test";

async function openSearch(
  page: import("@playwright/test").Page,
  path = "/pt-BR/search",
) {
  await page.goto(path);
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({
    timeout: 12_000,
  });
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) =>
    console.error(`[browser error] ${error.stack}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error")
      console.error(`[browser console] ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script")
      console.error(
        `[browser request] ${request.url()} ${request.failure()?.errorText}`,
      );
  });
});

test("renders a shape-matched skeleton before the catalog", async ({
  page,
}) => {
  await page.goto("/pt-BR/search", { waitUntil: "commit" });

  await expect(page.locator(".catalog-search-hero-loading")).toBeVisible();
  await expect(page.locator(".catalog-result-loading")).toHaveCount(18);
  await expect(
    page.getByRole("heading", { name: "Explore o catálogo" }),
  ).toBeVisible();
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({
    timeout: 12_000,
  });
  await expect(page.locator(".catalog-search-loading")).toHaveCount(0);
});

test("persists combined filters and sorting in the URL", async ({ page }) => {
  await openSearch(page);

  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeVisible();
  await page.getByText("Gêneros", { exact: true }).click();
  await page
    .locator(".catalog-filter-options > label")
    .filter({ hasText: "Adventure" })
    .click();
  await expect(page).not.toHaveURL(/genres=31/);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/genres=31/);
  await expect(
    page.getByText("31 encontrados · 24 nesta página"),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Ordenar resultados" }).click();
  await page.getByRole("option", { name: "Nome A–Z" }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(
    page.locator(".catalog-active-filters").getByText("Adventure", {
      exact: true,
    }),
  ).toBeVisible();
});

test("keeps catalog credit in the global footer only", async ({ page }) => {
  await openSearch(page);

  await expect(page.locator(".catalog-search-hero")).not.toContainText("IGDB");
  await expect(page.getByRole("link", { name: "IGDB" })).toHaveAttribute(
    "href",
    "https://www.igdb.com/",
  );
});

test("keeps the route search directly below its title and description", async ({
  page,
}) => {
  await openSearch(page);

  const geometry = await page.evaluate(() => {
    const copy = document.querySelector(
      ".catalog-search-hero-copy",
    ) as HTMLElement;
    const form = document.querySelector(
      ".catalog-search-main-form",
    ) as HTMLElement;
    const copyBox = copy.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    return {
      copyBottom: copyBox.bottom,
      formTop: formBox.top,
      copyLeft: copyBox.left,
      formLeft: formBox.left,
    };
  });

  expect(geometry.formTop).toBeGreaterThan(geometry.copyBottom);
  expect(Math.abs(geometry.formLeft - geometry.copyLeft)).toBeLessThanOrEqual(
    1,
  );
});

test("routes creation modes through game selection", async ({ page }) => {
  await openSearch(page, "/pt-BR/search?create=screenshot");
  await expect(
    page.getByRole("heading", { name: "De qual jogo é a captura?" }),
  ).toBeVisible();
  await expect(page.locator(".quick-game-link").first()).toHaveAttribute(
    "href",
    /\/pt-BR\/game\/e2e-game-\d+\?screenshot=1$/,
  );

  await openSearch(page, "/pt-BR/search?create=review");
  await expect(
    page.getByRole("heading", { name: "Qual jogo você quer avaliar?" }),
  ).toBeVisible();
  await expect(page.locator(".quick-game-link").first()).toHaveAttribute(
    "href",
    /\/pt-BR\/game\/e2e-game-\d+\?review=1$/,
  );
});

test("keeps protected quick creation visible while signed out", async ({
  page,
}, testInfo) => {
  await openSearch(page);
  const trigger = page.locator(
    testInfo.project.name.startsWith("mobile")
      ? ".quick-create-mobile .quick-create-trigger"
      : ".quick-create-sidebar .quick-create-trigger",
  );
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeDisabled();
});

test("opens the filters dialog and applies a complete draft once", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  await openSearch(page);

  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(page.locator(".catalog-filter-dialog")).toBeVisible();
  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeVisible();

  await page.getByText("Lançados", { exact: true }).click();
  await page.getByText("Somente jogos avaliados", { exact: true }).click();
  await page.getByText("Perspectiva", { exact: true }).click();
  await page
    .locator(".catalog-filter-options > label")
    .filter({ hasText: "First person" })
    .click();
  await expect(page).not.toHaveURL(/release=released/);

  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/release=released/);
  await expect(page).toHaveURL(/rated=1/);
  await expect(page).toHaveURL(/perspectives=1/);
});

test("navigates by page number, last page, and direct jump", async ({
  page,
}) => {
  await openSearch(page);

  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const pagination = page.getByRole("navigation", { name: "Paginação" });
  await expect(pagination.getByText("Página 2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Última" }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(pagination.getByText("Página 3", { exact: true })).toBeVisible();

  await page.getByLabel("Ir para").fill("1");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page).not.toHaveURL(/page=/);
  await expect(pagination.getByText("Página 1", { exact: true })).toBeVisible();
});

test("keeps the mobile explorer inside the viewport", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await openSearch(page);

  await expect(
    page.getByRole("button", { name: "Filtros avançados" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);

  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(page.locator(".catalog-filter-dialog")).toBeVisible();
  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeVisible();

  const openDimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(openDimensions.document).toBeLessThanOrEqual(openDimensions.viewport);
});

test("uses the contextual rail without squeezing the wide catalog", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ width: 1500, height: 900 });
  await openSearch(page, "/pt-BR/search?genres=31&sort=name");

  const results = page.locator(".catalog-results-panel");
  const context = page.locator(".catalog-context-rail");
  await expect(context).toBeVisible();
  await expect(context.getByText("Sua busca", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filtros avançados" }),
  ).toBeVisible();

  const [resultBox, contextBox] = await Promise.all([
    results.boundingBox(),
    context.boundingBox(),
  ]);
  expect(resultBox).not.toBeNull();
  expect(contextBox).not.toBeNull();
  expect(resultBox!.x + resultBox!.width).toBeLessThan(contextBox!.x);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
