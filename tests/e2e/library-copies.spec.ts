import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveCopies,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * The library, counted by copy instead of by game.
 *
 * The other view answers "which games are mine". This one answers the
 * questions about the same shelf that it cannot: what is physical, what is on
 * Steam, what is only borrowed, and which games are owned more than once. A
 * game appears once per copy here, which is exactly why the two are separate
 * views: the count of games has to keep meaning games.
 *
 * Everything below goes through the server: the page, the order, the filters,
 * the search and the counts. A shelf is not always small.
 */
test.describe("the copies view", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(180_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  const PC = { id: 6, name: "PC" };
  const PS5 = { id: 167, name: "PlayStation 5" };
  const SWITCH = { id: 130, name: "Nintendo Switch" };

  test("one game, three copies, and the counts stay apart", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("copycount");
    accounts.push(owner);
    await signIn(context, owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);

    // Through the route rather than the fixture, because this is also where
    // the write is proved: three different copies of one game are three rows,
    // and asking a fourth time for one already recorded is not a fourth row.
    const record = (copy: Record<string, unknown>) =>
      context.request.post("/api/v1/library/copies", {
        data: { igdb_id: 900_001, game_slug: "e2e-game-1", ...copy },
      });
    for (const copy of [
      {
        platform_id: PC.id,
        platform_name: PC.name,
        medium: "DIGITAL",
        storefront: "STEAM",
      },
      {
        platform_id: PS5.id,
        platform_name: PS5.name,
        medium: "PHYSICAL",
        storefront: "RETAIL",
      },
      {
        platform_id: SWITCH.id,
        platform_name: SWITCH.name,
        medium: "PHYSICAL",
        storefront: "RETAIL",
      },
    ]) {
      const made = await record(copy);
      expect(made.status(), await made.text()).toBe(200);
      expect((await made.json()).created).toBe(true);
    }
    const again = await record({
      platform_id: PS5.id,
      platform_name: PS5.name,
      medium: "PHYSICAL",
      storefront: "RETAIL",
    });
    expect((await again.json()).created).toBe(false);

    await page.goto(`/pt-BR/library/${owner.username}`);
    const views = page.locator(".library-views");
    await views.getByRole("button", { name: "Cópias" }).click();

    // Three rows for one game, and the header says both numbers.
    await expect(page.locator(".library-copies-list li")).toHaveCount(3, {
      timeout: 30_000,
    });
    const header = page.locator(".library-copies header");
    await expect(header).toContainText("3 cópias de 1 jogos");
    await expect(header).toContainText("1 mais de uma vez");
    await expect(header).toContainText("1 em mais de uma plataforma");

    // And the games view is still about games: one.
    await views.getByRole("button", { name: "Jogos" }).click();
    await expect(page.locator(".library-copies")).toHaveCount(0);
    await expect(page.locator(".quick-game-card")).toHaveCount(1);
  });

  test("two identical discs are not two platforms", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("copytwice");
    accounts.push(owner);
    await signIn(context, owner);
    await giveCopies(owner, [
      // Game 1 twice, on the same platform.
      { game: 1, platform: PS5, medium: "PHYSICAL" },
      { game: 1, platform: PS5, medium: "PHYSICAL" },
      // Game 2 on two different ones.
      { game: 2, platform: PC, medium: "DIGITAL", storefront: "STEAM" },
      { game: 2, platform: PS5, medium: "PHYSICAL" },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies`);
    const header = page.locator(".library-copies header");
    await expect(header).toContainText("4 cópias de 2 jogos", {
      timeout: 30_000,
    });
    // Two games are owned twice; only one of them is on two platforms.
    await expect(header).toContainText("2 mais de uma vez");
    await expect(header).toContainText("1 em mais de uma plataforma");
    // And the duplicate is still two rows: a copy is a copy.
    await expect(page.locator(".library-copies-list li")).toHaveCount(4);
  });

  test("filters, search and sort are the address", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("copyfilter");
    accounts.push(owner);
    await signIn(context, owner);
    // Minutes apart, because this one is about the order as well: written in
    // one instant they would come back in whatever order their ids fall in,
    // which is correct paging and says nothing about "newest".
    await giveCopies(owner, [
      {
        game: 1,
        platform: PC,
        medium: "DIGITAL",
        storefront: "STEAM",
        secondsAgo: 400,
      },
      {
        game: 2,
        platform: PS5,
        medium: "PHYSICAL",
        storefront: "RETAIL",
        secondsAgo: 300,
      },
      {
        game: 3,
        platform: SWITCH,
        medium: "PHYSICAL",
        storefront: "RETAIL",
        secondsAgo: 200,
      },
      {
        game: 4,
        platform: PC,
        medium: "DIGITAL",
        storefront: "STEAM",
        edition: "Collector's Edition",
        secondsAgo: 100,
      },
    ]);

    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies`);
    const rows = page.locator(".library-copies-list li");
    await expect(rows).toHaveCount(4, { timeout: 30_000 });
    // Newest first, so the copy recorded last is the one on top.
    await expect(rows.first()).toContainText("E2E Game 04");

    // A facet counts the whole shelf rather than the page: two Steam copies.
    const facets = page.locator(".library-copies-facets");
    await expect(facets).toContainText("Steam");
    await facets.getByRole("button", { name: /^Steam/ }).click();
    await expect(rows).toHaveCount(2);
    await expect(page).toHaveURL(/storefront=STEAM/);
    // Clicking the chosen one again is the way back out, and the whole shelf
    // returns rather than an empty one.
    await facets.getByRole("button", { name: /^Steam/ }).click();
    await expect(rows).toHaveCount(4);
    await expect(page).not.toHaveURL(/storefront=/);
    await facets.getByRole("button", { name: /^Steam/ }).click();
    await expect(rows).toHaveCount(2);

    // And the other facets are recounted with that one applied, so there is no
    // dead end to click: nothing on Steam is physical here, so the chip that
    // would have returned nothing is gone.
    const mediums = facets.locator(".library-copies-facet").filter({
      hasText: "Mídia",
    });
    await expect(
      mediums.getByRole("button", { name: /^Digital/ }),
    ).toBeVisible();
    await expect(mediums.getByRole("button", { name: /^Físico/ })).toHaveCount(
      0,
    );

    // The combination is still answerable by address, and it answers nothing.
    await page.goto(
      `/pt-BR/library/${owner.username}?shelf=copies&storefront=STEAM&medium=PHYSICAL`,
    );
    await expect(page.locator(".library-copies-empty")).toContainText(
      "Nenhuma cópia com esses filtros",
      { timeout: 30_000 },
    );

    // Sorting is the address too, and by title the first row is the first game.
    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies&sort=title`);
    await expect(rows.first()).toContainText("E2E Game 01", {
      timeout: 30_000,
    });

    // Search reads the title and the edition.
    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies`);
    await expect(rows).toHaveCount(4, { timeout: 30_000 });
    await facets.getByRole("button", { name: /^Steam/ }).click();
    await expect(rows).toHaveCount(2);
    await page.locator(".library-copies-search input").fill("collector");
    await page.keyboard.press("Enter");
    await expect(rows).toHaveCount(1, { timeout: 20_000 });
    await expect(page).toHaveURL(/q=collector/);

    // Reloading keeps the question, in the address and in the box.
    await page.reload();
    await expect(page.locator(".library-copies-list li")).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(page.locator(".library-copies-search input")).toHaveValue(
      "collector",
    );

    // Walking back out of the search restores the filter that was under it,
    // and the box follows the address rather than pushing its text back.
    await page.goBack();
    await expect(page).not.toHaveURL(/q=collector/);
    await expect(page).toHaveURL(/storefront=STEAM/);
    await expect(page.locator(".library-copies-list li")).toHaveCount(2, {
      timeout: 30_000,
    });
    await expect(page.locator(".library-copies-search input")).toHaveValue("");

    // And forward walks back into it.
    await page.goForward();
    await expect(page).toHaveURL(/q=collector/);
    await expect(page.locator(".library-copies-list li")).toHaveCount(1, {
      timeout: 30_000,
    });
  });

  test("sixty copies come back as pages, once each", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    const owner = await createAccount("copypage");
    accounts.push(owner);
    await signIn(context, owner);
    // Written in one transaction, so every row shares a `created_at`: the case
    // a cursor without a tie-break repeats a page on for ever.
    await giveCopies(
      owner,
      Array.from({ length: 60 }, (_, index) => ({
        game: (index % 40) + 1,
        platform: [PC, PS5, SWITCH][index % 3],
        medium: index % 2 ? ("DIGITAL" as const) : ("PHYSICAL" as const),
      })),
    );

    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies`);
    const rows = page.locator(".library-copies-list li");
    // A page is twenty-four, not the whole shelf: the point of the cursor.
    await expect(rows).toHaveCount(24, { timeout: 30_000 });
    await expect(page.locator(".library-copies header")).toContainText(
      "60 cópias de 40 jogos",
    );

    await page.locator(".library-copies-more").click();
    await expect(rows).toHaveCount(48, { timeout: 20_000 });
    await page.locator(".library-copies-more").click();
    await expect(rows).toHaveCount(60, { timeout: 20_000 });
    // Sixty rows, sixty different copies, and no button left.
    await expect(page.locator(".library-copies-more")).toHaveCount(0);
  });

  test("grouping counts copies, and both shapes draw", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("copygroup");
    accounts.push(owner);
    await signIn(context, owner);
    await giveCopies(owner, [
      { game: 1, platform: PC, medium: "DIGITAL", storefront: "STEAM" },
      { game: 2, platform: PC, medium: "DIGITAL", storefront: "STEAM" },
      { game: 3, platform: PS5, medium: "PHYSICAL", storefront: "RETAIL" },
    ]);

    await page.goto(
      `/pt-BR/library/${owner.username}?shelf=copies&group=storefront`,
    );
    const groups = page.locator(".library-copies-group");
    await expect(groups).toHaveCount(2, { timeout: 30_000 });
    // Two copies of two different games under Steam: a group counts copies.
    await expect(groups.filter({ hasText: "Steam" })).toContainText("2 cópias");
    await expect(groups.filter({ hasText: "Loja física" })).toContainText(
      "1 cópia",
    );

    await page.goto(`/pt-BR/library/${owner.username}?shelf=copies&view=grid`);
    await expect(page.locator('.library-copies[data-view="grid"]')).toBeVisible(
      { timeout: 30_000 },
    );
    await expect(page.locator(".library-copies-list li")).toHaveCount(3);
  });
});
