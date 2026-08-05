import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * The three surfaces that answer "what now" and "who else".
 *
 * They are shelves and a scope rather than components, which is why they need
 * a browser: each one is a query, a permission rule and a piece of markup that
 * only meet on a rendered page. A unit test proves the ranking is a ranking; it
 * cannot notice that the shelf renders for nobody because the promise was
 * never awaited, or that the tab exists and returns an empty list.
 */

test.describe("reading the community", () => {
  // Signed out on purpose. Reviews are public, so this is the part of the
  // feature that has to work for a visitor who has not joined yet, and it is
  // the part that runs on every CI run rather than only where a service key
  // is configured.
  test("the reviews scope lists writing from the whole site", async ({
    page,
  }) => {
    await page.goto("/pt-BR/search?scope=reviews");
    await page.locator("main").first().waitFor({ state: "visible" });

    await expect(
      page.getByRole("heading", { name: "Leia o que a comunidade escreveu" }),
    ).toBeVisible();
    // The tab has to be the current one, not merely present: a scope that
    // renders its results under the games tab is a scope nobody can navigate
    // back to.
    await expect(
      page.locator(".search-scope-tabs").getByRole("link", { name: "Reviews" }),
    ).toHaveAttribute("aria-current", "page");

    const entries = page.locator('[data-kind="review"]');
    await expect(entries.first()).toBeVisible();
    // More than one, because a page that happens to render a single entry is
    // what a broken limit also looks like.
    expect(await entries.count()).toBeGreaterThan(1);
  });

  test("the home page offers a way to all of them", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });
    // The whole point of the link: four reviews are shown and the rest were
    // unreachable without knowing the scope existed.
    await expect(
      page.locator('a[href*="scope=reviews"]').first(),
    ).toBeVisible();
  });

  test("the ratings sort is offered and holds", async ({ page }) => {
    await page.goto("/pt-BR/search?scope=reviews&sort=rating");
    await page.locator("main").first().waitFor({ state: "visible" });
    await expect(page.locator('[data-kind="review"]').first()).toBeVisible();
    // This sort is the reason the numbered pager replaced the load button. An
    // order the page refused would fall back to recent without complaining,
    // and the only visible difference is which sort it says is active.
    await expect(page.getByText("Melhor avaliadas").first()).toBeVisible();
    // Page two has to be reachable, because ordering by rating is exactly what
    // a cursor walking `created_at` could not paginate.
    await page.goto("/pt-BR/search?scope=reviews&sort=rating&page=2");
    await page.locator("main").first().waitFor({ state: "visible" });
    await expect(page.locator('[data-kind="review"]').first()).toBeVisible();
  });
});

test.describe("shelves that read your own library", () => {
  test.skip(
    !canSignIn,
    "needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and the publishable key",
  );
  // Serial for the same reason the other signed-in file is: these create
  // accounts against the one shared database.
  test.describe.configure({ mode: "serial" });

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("the home page opens with what was left unfinished", async ({
    page,
    context,
  }) => {
    const account = await createAccount("shelf");
    accounts.push(account);
    await giveLibrary(account, [
      // Thirty-eight days, not thirty-five: five weeks exactly sits on the
      // boundary the rule floors at, and a few hours of clock drift either way
      // would flip the label to four. This lands in the middle of the band.
      { game: 1, status: "PLAYING", daysAgo: 38 },
      { game: 2, status: "PLAYING" },
      { game: 3, status: "BACKLOG", daysAgo: 63 },
      { game: 4, status: "BACKLOG" },
    ]);
    await signIn(context, account);

    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });

    await expect(
      page.getByRole("heading", { name: "Continuar jogando" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Da sua fila" }),
    ).toBeVisible();
    // Five weeks, in words, under the card. The number is computed rather than
    // stored, so a wrong unit would read as "parado há 35 semanas" and still
    // look like a working feature.
    await expect(page.getByText("parado há 5 semanas")).toBeVisible();
  });

  test("an empty library is offered no shelves at all", async ({
    page,
    context,
  }) => {
    const account = await createAccount("bare");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });
    // A heading over nothing is worse than no heading. Both shelves return
    // null when they have no entries, and this is what says so.
    await expect(
      page.getByRole("heading", { name: "Continuar jogando" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Jogam o que você joga" }),
    ).toHaveCount(0);
  });

  test("someone with the same taste is introduced", async ({
    page,
    context,
  }) => {
    const neighbour = await createAccount("near");
    accounts.push(neighbour);
    const viewer = await createAccount("seeker");
    accounts.push(viewer);
    // Four titles in both libraries, one over the threshold of three, and no
    // follow between them: exactly the row the shelf exists to produce.
    const shared = [11, 12, 13, 14] as const;
    await giveLibrary(neighbour, [
      ...shared.map((game) => ({ game, status: "COMPLETED" as const })),
      { game: 15, status: "COMPLETED" as const },
    ]);
    await giveLibrary(viewer, [
      ...shared.map((game) => ({ game, status: "COMPLETED" as const })),
      { game: 16, status: "COMPLETED" as const },
    ]);
    await signIn(context, viewer);

    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });

    await expect(
      page.getByRole("heading", { name: "Jogam o que você joga" }),
    ).toBeVisible();
    const card = page.locator(".profile-connection-card", {
      hasText: neighbour.username,
    });
    await expect(card).toBeVisible();
    // The reason, spelled out on the card. Without it the shelf is a list of
    // strangers, which is what the site already had.
    await expect(card).toContainText("4 em comum");
    // And a way past the six that fit.
    await expect(page.locator('a[href*="scope=people"]').first()).toBeVisible();
  });
});
