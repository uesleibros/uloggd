import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  giveIgnoredGames,
  signIn,
  issueApiKey,
  type TestAccount,
} from "./fixtures/account";

test.describe("global series progress", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(120_000);
  let owner: TestAccount;
  let visitor: TestAccount;
  test.beforeAll(async () => {
    owner = await createAccount("globalseries");
    visitor = await createAccount("seriesvisitor");
    await giveLibrary(owner, [
      ...[60, 11, 12, 13, 14, 15, 16, 19, 20].map((game) => ({
        game,
        status: "COMPLETED" as const,
      })),
      ...[17, 22].map((game) => ({ game, status: "PLAYING" as const })),
      ...[18, 23, 25, 26, 28, 29, 31, 32].map((game) => ({
        game,
        status: "BACKLOG" as const,
      })),
    ]);
  });
  test.beforeEach(async ({ context }) => {
    await giveIgnoredGames(owner, [31, 32, 33]);
    await signIn(context, owner);
  });
  test.afterAll(async () => {
    if (owner) await destroyAccount(owner);
    if (visitor) await destroyAccount(visitor);
  });
  const workspace = (page: import("@playwright/test").Page) =>
    page.locator('.series-workspace[data-loaded="true"]');

  test("summary and full workspace reserve covers while loading and use styled controls", async ({
    page,
  }, testInfo) => {
    let release!: () => void;
    let held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/library/series*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`/pt-BR/library/${owner.username}`, {
      waitUntil: "domcontentloaded",
    });
    const consent = page.getByRole("button", {
      name: "Continuar com necessários",
    });
    if (await consent.isVisible()) await consent.click();
    await expect(page.locator(".page-back-link:visible")).toHaveCSS(
      "text-decoration-line",
      "none",
    );
    await expect(
      page.locator(".library-series-skeleton-row:visible"),
    ).toHaveCount(6);
    await expect(
      page.locator(".library-series-skeleton-row:visible > div > span"),
    ).toHaveCount(48);
    release();
    const all = page.getByRole("button", { name: "Ver todas as séries" });
    await expect(all).toBeVisible();
    await expect(all).toHaveCSS("border-radius", "8px");
    await expect(all).toHaveCSS("text-decoration-line", "none");
    await expect(all.locator("svg")).toHaveCount(1);
    held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await all.click();
    const full = page.locator(".series-workspace");
    await expect(full.locator(".library-series-skeleton-row")).toHaveCount(6);
    await expect(full).toHaveAttribute("aria-busy", "true");
    await full
      .locator("header")
      .evaluate((node) =>
        node.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await page.screenshot({ path: testInfo.outputPath("series-loading.png") });
    release();
    await expect(full.locator("[data-series-key]")).toHaveCount(6);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      const selected = full.getByRole("button", {
        name: "Todas 8",
        exact: true,
      });
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      await expect(selected).toHaveCSS("border-bottom-width", "2px");
      await full
        .locator("header")
        .evaluate((node) =>
          node.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      await page.screenshot({
        path: testInfo.outputPath(`series-${theme}.png`),
      });
    }
  });

  test("missing page shows skeletons, retries only its batch, and reload fetches the requested page once", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    const full = workspace(page);
    await expect(full.locator("[data-series-key]")).toHaveCount(6);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0;
    await page.route("**/api/v1/library/series*", async (route) => {
      reads++;
      await held;
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "rate_limited", message: "busy" },
        }),
      });
    });
    await full.getByRole("button", { name: "Última", exact: true }).click();
    await expect(full.locator(".library-series-skeleton-row")).toHaveCount(2);
    await expect(full).toHaveAttribute("aria-busy", "true");
    release();
    await expect(full.locator(".load-error")).toContainText(
      "O catálogo está temporariamente ocupado",
    );
    expect(reads).toBe(1);
    await page.unrouteAll({ behavior: "wait" });
    const retried: string[] = [];
    await page.route("**/api/v1/library/series*", async (route) => {
      retried.push(route.request().url());
      await route.continue();
    });
    await full.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(full.locator("[data-series-key]")).toHaveCount(2);
    expect(retried).toHaveLength(1);
    expect(new URL(retried[0]).searchParams.has("keys")).toBe(true);
    retried.length = 0;
    await page.reload();
    await expect(full.locator("[data-series-key]")).toHaveCount(2);
    await page.waitForLoadState("networkidle");
    expect(retried).toHaveLength(1);
    expect(new URL(retried[0]).searchParams.get("page")).toBe("2");
    expect(new URL(retried[0]).searchParams.has("keys")).toBe(false);
  });

  test("summary is six but all eight series are reachable with a compact first payload", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}`);
    const summary = page.locator(".library-series:not(.series-workspace)");
    await expect(summary.locator(".library-series-list > li")).toHaveCount(6);
    await summary.getByRole("button", { name: "Ver todas as séries" }).click();
    await expect(page).toHaveURL(/shelf=series/);
    const full = workspace(page);
    await expect(summary).toHaveCount(0);
    await expect(
      full.locator(".library-series-list > li[data-series-key]"),
    ).toHaveCount(6);
    const seen = new Set(
      await full
        .locator("[data-series-key]")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-series-key")),
        ),
    );
    await full.getByRole("button", { name: "Última", exact: true }).click();
    await expect(
      full.locator(".library-series-list > li[data-series-key]"),
    ).toHaveCount(2);
    for (const key of await full
      .locator("[data-series-key]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-series-key")),
      ))
      seen.add(key);
    expect(seen.size).toBe(8);
    const response = await page.request.get("/api/v1/library/series");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.index).toHaveLength(8);
    expect(body.data).toHaveLength(6);
    expect(body.total_pages).toBe(2);
    expect(body.index[0].slots[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        state: expect.any(String),
      }),
    );
    expect(body.index[0].slots[0]).not.toHaveProperty("cover");
    const gameReads: string[] = [];
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.endsWith(
          `/profiles/${owner.username}/library`,
        )
      )
        gameReads.push(request.url());
    });
    await page.reload();
    await expect(full.locator("[data-series-key]")).toHaveCount(2);
    await page.waitForLoadState("networkidle");
    expect(gameReads).toEqual([]);
  });

  test("filters use global classification and never count backlog or every ignored game as completion", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    const full = workspace(page);
    await expect(
      full.getByRole("button", { name: "Todas 8", exact: true }),
    ).toBeVisible();
    await expect(
      full.getByRole("button", { name: "Em andamento 3", exact: true }),
    ).toBeVisible();
    await full
      .getByRole("button", { name: "Concluídas 2", exact: true })
      .click();
    await expect(full.locator("[data-series-key]")).toHaveCount(2);
    await expect(full.locator('[data-status="completed"]')).toHaveCount(2);
    await full
      .getByRole("button", { name: "Em andamento 3", exact: true })
      .click();
    await expect(full.locator('[data-status="progress"]')).toHaveCount(3);
    await full.getByRole("button", { name: "Todas 8", exact: true }).click();
    const allIgnored = full.locator('[data-series-key="collection:91007"]');
    await expect(allIgnored).toContainText("0/0 jogados");
    await expect(allIgnored).toContainText("3 ignorados");
    await expect(allIgnored).toHaveAttribute("data-status", "unstarted");
    const backlog = full.locator('[data-series-key="collection:91005"]');
    await expect(backlog).toContainText("0/3 jogados");
    await expect(backlog.locator(".library-series-next")).toContainText(
      "E2E Game 25",
    );
  });

  test("search, reload and history keep URL and UI together", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    const full = workspace(page);
    await full
      .getByRole("button", { name: "Concluídas 2", exact: true })
      .click();
    const search = full.getByRole("textbox", { name: "Buscar série" });
    await search.fill("Resident");
    await search.press("Enter");
    await expect(full.locator("[data-series-key]")).toHaveCount(1);
    await expect(full).toContainText("Resident E2E");
    await expect(full).not.toContainText("Persona E2E");
    await page.reload();
    await expect(search).toHaveValue("Resident");
    await expect(
      full.getByRole("button", { name: "Concluídas 2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await full
      .getByRole("button", { name: "Em andamento 3", exact: true })
      .click();
    await expect(full).toContainText(
      "Nenhuma série encontrada para esta busca.",
    );
    await page.goBack();
    await expect(full.locator("[data-series-key]")).toHaveCount(1);
    await page.goBack();
    await expect(search).toHaveValue("");
    await expect(full.locator("[data-series-key]")).toHaveCount(2);
    await page.goForward();
    await expect(search).toHaveValue("Resident");
    await expect(full.locator("[data-series-key]")).toHaveCount(1);
  });

  test("ignore moves a nearly finished series between filters before the network settles", async ({
    page,
  }) => {
    await page.goto(
      `/pt-BR/library/${owner.username}?shelf=series&filter=progress`,
    );
    const full = workspace(page);
    const row = full.locator('[data-series-key="collection:91003"]');
    await expect(row).toContainText("2/3 jogados");
    await page.route("**/api/v1/library/ignored**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await row.locator('[data-slot-id="900021"] .series-ignore').click();
    await expect(row).toHaveCount(0, { timeout: 350 });
    await expect(
      full.getByRole("button", { name: "Concluídas 3", exact: true }),
    ).toBeVisible();
    await full
      .getByRole("button", { name: "Concluídas 3", exact: true })
      .click();
    await expect(row).toContainText("2/2 jogados");
    await row.locator('[data-slot-id="900021"] .series-ignore').click();
    await expect(row).toHaveCount(0, { timeout: 350 });
    await full
      .getByRole("button", { name: "Em andamento 3", exact: true })
      .click();
    await expect(row).toContainText("2/3 jogados");
    await page.unrouteAll({ behavior: "wait" });
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(row).toContainText("2/3 jogados");
  });

  test("a finished remake satisfies its canonical cover with a visible explanation", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series&q=Resident`);
    const row = workspace(page).locator('[data-series-key="collection:91000"]');
    await expect(row).toContainText("3/3 jogados");
    await expect(row.locator(".library-series-covers > ol > li")).toHaveCount(
      3,
    );
    const base = row.locator('[data-slot-id="900010"] a');
    await expect(base).toHaveAttribute(
      "aria-label",
      /Concluído via Resident E2E Remake/,
    );
    await expect(row.locator(".library-series-via")).toContainText(
      "Concluído via Resident E2E Remake",
    );
    await base.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator(".app-tooltip")).toContainText(
      "Resident E2E Remake",
    );
  });

  test("one held game in each series is enough for the full workspace", async ({
    page,
    context,
  }) => {
    const single = await createAccount("seriesone");
    try {
      await giveLibrary(single, [
        { game: 10, status: "BACKLOG" },
        { game: 13, status: "BACKLOG" },
      ]);
      await signIn(context, single);
      await page.goto(`/pt-BR/library/${single.username}?shelf=series`);
      await expect(workspace(page).locator("[data-series-key]")).toHaveCount(2);
      const summary = await page.request.get(
        "/api/v1/library/series?summary=1",
      );
      expect((await summary.json()).data).toEqual([]);
      await workspace(page)
        .getByRole("button", { name: "Concluídas 0", exact: true })
        .click();
      await expect(workspace(page)).toContainText(
        "Nenhuma série neste filtro.",
      );
    } finally {
      await destroyAccount(single);
    }
  });

  test("visitor views and API keys cannot ask for another person's progress or ignored list", async ({
    page,
    context,
  }) => {
    await signIn(context, visitor);
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    await expect(
      page.locator(".quick-game-card:visible").first(),
    ).toBeVisible();
    await expect(page.locator(".library-views")).toHaveCount(0);
    await expect(page.locator(".library-series")).toHaveCount(0);
    const own = await page.request.get("/api/v1/library/series");
    expect((await own.json()).index).toEqual([]);
    expect(
      (
        await page.request.get(
          `/api/v1/library/series?username=${owner.username}`,
        )
      ).status(),
    ).toBe(400);
    const noScope = await issueApiKey(visitor, ["profile.read"]);
    expect(
      (
        await page.request.get("/api/v1/library/series", {
          headers: { Authorization: `Bearer ${noScope.token}` },
        })
      ).status(),
    ).toBe(403);
    const scoped = await issueApiKey(visitor, ["library.read"]);
    const privateRead = await page.request.get("/api/v1/library/series", {
      headers: { Authorization: `Bearer ${scoped.token}` },
    });
    expect(privateRead.status()).toBe(200);
    expect((await privateRead.json()).ignored).toEqual([]);
    await page.goto(`/pt-BR/library/${visitor.username}?shelf=series`);
    await expect(workspace(page)).toContainText(
      "Sua biblioteca ainda não tem jogos de uma série com mais de uma parte.",
    );
    await context.clearCookies();
    expect((await page.request.get("/api/v1/library/series")).status()).toBe(
      401,
    );
  });

  test("a read failure is an error, can retry and preserves a previously successful page", async ({
    page,
  }) => {
    const fail = async (route: import("@playwright/test").Route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "internal", message: "fixture unavailable" },
        }),
      });
    await page.route("**/api/v1/library/series*", fail);
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series`);
    await expect(page.locator(".series-workspace .load-error")).toContainText(
      "Não foi possível carregar as séries.",
    );
    await expect(page.locator(".series-workspace-empty")).toHaveCount(0);
    await page.unroute("**/api/v1/library/series*", fail);
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    const full = workspace(page);
    await expect(full.locator("[data-series-key]")).toHaveCount(6);
    await page.route("**/api/v1/library/series*", fail);
    await full.getByRole("button", { name: "Última", exact: true }).click();
    await expect(page.locator(".series-workspace .load-error")).toBeVisible();
    await full.getByRole("button", { name: "Primeira", exact: true }).click();
    await expect(full.locator("[data-series-key]")).toHaveCount(6);
  });

  test("sort and pagination remain usable without horizontal page overflow in both themes", async ({
    page,
  }) => {
    await page.goto(`/pt-BR/library/${owner.username}?shelf=series&sort=name`);
    const full = workspace(page);
    await expect(full.locator("[data-series-key]").first()).toHaveAttribute(
      "data-series-key",
      "collection:91001",
    );
    await full.getByRole("combobox", { name: "Ordenar séries" }).click();
    await page.getByRole("option", { name: "Progresso", exact: true }).click();
    await expect(full.locator("[data-series-key]").first()).toHaveAttribute(
      "data-status",
      "progress",
    );
    await full.getByRole("combobox", { name: "Ordenar séries" }).click();
    await page.getByRole("option", { name: "Nome", exact: true }).click();
    await expect(page).toHaveURL(/sort=name/);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      const width = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        window: innerWidth,
      }));
      expect(width.page).toBeLessThanOrEqual(width.window + 1);
      await full.getByRole("button", { name: "Última", exact: true }).click();
      await expect(full.locator("[data-series-key]")).toHaveCount(2);
      await full.getByRole("button", { name: "Primeira", exact: true }).click();
      await expect(full.locator("[data-series-key]")).toHaveCount(6);
    }
  });
});
