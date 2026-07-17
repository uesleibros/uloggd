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

test("keeps the filter rail bounded and applies a complete draft once", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  await openSearch(page);

  const rail = page.locator(".catalog-filter-shell > aside");
  const box = await rail.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(620);

  const trailingSpace = await rail
    .locator(".catalog-filter-body")
    .evaluate((body) => {
      const lastFilter = body.lastElementChild;
      if (!lastFilter) return 0;
      const bodyRect = body.getBoundingClientRect();
      const lastRect = lastFilter.getBoundingClientRect();
      const lastContentBottom = lastRect.bottom - bodyRect.top + body.scrollTop;
      return Math.max(0, Math.round(body.scrollHeight - lastContentBottom));
    });
  expect(trailingSpace).toBeLessThanOrEqual(16);

  const scrollGeometry = await rail
    .locator(".catalog-filter-body")
    .evaluate((body) => {
      body.scrollTop = body.scrollHeight;
      const lastFilter = body.lastElementChild;
      const bodyRect = body.getBoundingClientRect();
      const lastRect = lastFilter?.getBoundingClientRect();
      return {
        remaining: Math.round(
          body.scrollHeight - body.scrollTop - body.clientHeight,
        ),
        lastBottomGap: lastRect
          ? Math.round(bodyRect.bottom - lastRect.bottom)
          : Number.POSITIVE_INFINITY,
      };
    });
  expect(scrollGeometry.remaining).toBeLessThanOrEqual(1);
  expect(scrollGeometry.lastBottomGap).toBeLessThanOrEqual(16);

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
    page.getByText("Filtros avançados", { exact: true }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);

  await page.getByText("Filtros avançados", { exact: true }).click();
  await expect(page.getByText("REFINE A BUSCA", { exact: true })).toBeHidden();
});

test("uses the contextual rail without squeezing the wide catalog", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  await page.setViewportSize({ width: 1500, height: 900 });
  await openSearch(page, "/pt-BR/search?genres=31&sort=name");

  const filters = page.locator(".catalog-filter-shell");
  const results = page.locator(".catalog-results-panel");
  const context = page.locator(".catalog-context-rail");
  await expect(context).toBeVisible();
  await expect(context.getByText("Sua busca", { exact: true })).toBeVisible();

  const [filterBox, resultBox, contextBox] = await Promise.all([
    filters.boundingBox(),
    results.boundingBox(),
    context.boundingBox(),
  ]);
  expect(filterBox).not.toBeNull();
  expect(resultBox).not.toBeNull();
  expect(contextBox).not.toBeNull();
  expect(filterBox!.x + filterBox!.width).toBeLessThan(resultBox!.x);
  expect(resultBox!.x + resultBox!.width).toBeLessThan(contextBox!.x);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
