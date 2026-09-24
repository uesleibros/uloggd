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

test("the frame is immediate and the results hold a shape-matched place", async ({
  page,
}) => {
  // The page no longer searches on the server, so the frame arrives before the
  // route's own skeleton has a reason to show: the hero and the heading are
  // real from the first paint. What waits is the results, and while they do
  // they hold the same grid the route's skeleton draws, eighteen cards at the
  // real column width, so nothing jumps when the games land.
  await page.goto("/pt-BR/search", { waitUntil: "commit" });

  await expect(
    page.getByRole("heading", { name: "Explore o catálogo" }),
  ).toBeVisible();
  await expect(
    page.locator(".catalog-results-grid, .catalog-results-loading-grid"),
  ).toBeVisible();
  const placeholders = await page.locator(".catalog-result-loading").count();
  expect([0, 18]).toContain(placeholders);

  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({ timeout: 12_000 });
  await expect(page.locator(".catalog-results-grid")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".catalog-result-loading")).toHaveCount(0);
  await expect(page.locator(".catalog-search-loading")).toHaveCount(0);
});

test("persists combined filters and sorting in the URL", async ({ page }) => {
  await openSearch(page);

  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(
    page.getByRole("heading", { name: "Filtros avançados" }),
  ).toBeVisible();
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

  await expect(
    page.getByRole("heading", { name: "Filtros avançados" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(page.locator(".catalog-filter-dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Filtros avançados" }),
  ).toBeVisible();

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

test("keeps switches compact, accessible, and interactive inside filters", async ({
  page,
}) => {
  await openSearch(page);
  await page.getByRole("button", { name: "Filtros avançados" }).click();

  const ratedOnly = page.getByRole("switch", {
    name: "Somente jogos avaliados",
  });
  await expect(ratedOnly).toHaveAttribute("aria-checked", "false");
  const box = await ratedOnly.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(39);
  expect(box!.width).toBeLessThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(21);
  expect(box!.height).toBeLessThanOrEqual(22);

  await ratedOnly.click();
  await expect(ratedOnly).toHaveAttribute("aria-checked", "true");
});

test("opens the company directory from its canonical index route", async ({
  page,
}) => {
  await page.goto("/pt-BR/company");
  await expect(page).toHaveURL("/pt-BR/search?scope=companies");
  await expect(
    page.getByRole("heading", { name: "Encontre empresas de jogos" }),
  ).toBeVisible();
});

test("searches every vocabulary and keeps engine names in the URL", async ({
  page,
}) => {
  await openSearch(page);
  await page.getByRole("button", { name: "Filtros avançados" }).click();

  const groups = page.locator(".catalog-filter-group");
  await expect(groups).toHaveCount(8);
  await expect(page.locator(".catalog-filter-search input")).toHaveCount(8);

  await page.getByText("Engine", { exact: true }).click();
  await page.getByPlaceholder("Pesquisar em engine").fill("PowerPoint");
  await page
    .locator(".catalog-filter-options > label")
    .filter({ hasText: "PowerPoint" })
    .click();
  await page.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page).toHaveURL(/engines=PowerPoint/);
  await expect(
    page.locator(".catalog-active-filters").getByText("PowerPoint", {
      exact: true,
    }),
  ).toBeVisible();
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

  await expect(
    page.getByRole("heading", { name: "Filtros avançados" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Filtros avançados" }).click();
  await expect(page.locator(".catalog-filter-dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Filtros avançados" }),
  ).toBeVisible();

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

/**
 * A search across everybody's lists says whose each one is, and the heart on a
 * card counts likes rather than claiming one.
 *
 * The card drew a filled red heart as soon as a list had any likes at all, in
 * the colour this site uses for a like of your own, so every popular list read
 * as one the viewer had liked. And a page of list names said nothing about who
 * had made any of them.
 */
test("list results name their author and never claim a like", async ({
  page,
}) => {
  // Not `openSearch`: the hydration flag it waits for belongs to the
  // catalogue's own workspace, and the other scopes are a different one.
  await page.goto("/pt-BR/search?scope=lists");
  const cards = page.locator(".list-preview");
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });

  // Every card, because the owner comes from the same read as the list.
  const owners = await page.locator(".list-preview-owner").count();
  expect(owners).toBe(await cards.count());

  const filled = await page.evaluate(() =>
    [...document.querySelectorAll(".list-preview-likes svg")].filter(
      (heart) => (heart.getAttribute("fill") ?? "none") !== "none",
    ).length,
  );
  expect(filled).toBe(0);
});

/**
 * Every tab waits the way the catalogue does: in the shape of the card that
 * replaces it.
 *
 * Games have always waited as cover-and-two-lines placeholders. Every other
 * scope waited as a plain rectangle, so the same search looked like a
 * different page depending on the tab, and the results visibly rearranged
 * themselves when they landed.
 */
test("every scope waits in the shape of its own results", async ({ page }) => {
  // Held long enough for the skeleton to be what is on screen.
  await page.route("**/api/v1/search/**", async (route) => {
    await new Promise((done) => setTimeout(done, 4000));
    await route.continue();
  });

  for (const [scope, shape] of [
    ["people", "row"],
    ["companies", "row"],
    ["lists", "list"],
    ["tierlists", "list"],
  ] as const) {
    await page.goto(`/pt-BR/search?scope=${scope}`, { waitUntil: "commit" });
    const placeholder = page
      .locator(`.entity-result-loading[data-shape="${shape}"]`)
      .first();
    await expect(placeholder, `no shaped skeleton for ${scope}`).toBeVisible({
      timeout: 15_000,
    });
    // Shaped, not one flat block: the mark and the lines are separate pieces.
    expect(
      await placeholder.locator(".skeleton-block").count(),
      scope,
    ).toBeGreaterThan(2);
  }
});
