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

  test("a post in the feed says whether it has replies", async ({ page }) => {
    await page.goto("/pt-BR/search?scope=reviews");
    await page.locator("main").first().waitFor({ state: "visible" });
    // Liking was one click and commenting was noticing a link, leaving the
    // page and finding a box; the site has forty-three likes and six
    // comments. This is the affordance that was missing entirely.
    const conversation = page
      .locator('[data-kind="review"] .activity-comment-link')
      .first();
    await expect(conversation).toBeVisible();
    // Straight to the thread rather than the top of the page, so the reader
    // lands where the box is.
    await expect(conversation).toHaveAttribute(
      "href",
      /\/review\/.+#content-comments-title/,
    );
    // And the like button is still beside it: these two are the pair of things
    // you can do with a post, and asserting only the new one would pass on a
    // footer that had lost the other.
    await expect(
      page.locator('[data-kind="review"]').first().getByRole("button"),
    ).toBeTruthy();
  });

  test("lists say whether anybody replied, the same way posts do", async ({
    page,
  }) => {
    await page.goto("/pt-BR/search?scope=lists");
    await page.locator("main").first().waitFor({ state: "visible" });
    const card = page.locator(".list-preview-card, .lists-row > *").first();
    await expect(card).toBeVisible();
    // Two counts side by side. Asserting only the new one would pass on a card
    // that had lost its likes, and the point of this change is that the pair
    // reads as a pair wherever a post appears.
    const counts = card.locator(".list-preview-likes");
    expect(await counts.count()).toBe(2);
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
    const cardWidths = await page.evaluate(() => ({
      playNext:
        document
          .querySelector(".home-playing-carousel .quick-game-card")
          ?.getBoundingClientRect().width ?? null,
      catalogue:
        document
          .querySelector(".home-popular-carousel .quick-game-card")
          ?.getBoundingClientRect().width ?? null,
    }));
    expect(cardWidths.playNext).not.toBeNull();
    expect(cardWidths.catalogue).not.toBeNull();
    expect(cardWidths.playNext!).toBeCloseTo(cardWidths.catalogue!, 1);
    // Five weeks, in words, under the card. The number is computed rather than
    // stored, so a wrong unit would read as "parado há 35 semanas" and still
    // look like a working feature.
    await expect(page.getByText("parado há 5 semanas")).toBeVisible();
    // And the way to log a session on something you are in the middle of,
    // which until now was only offered on the game's own page.
    const session = page
      .getByRole("link", { name: "Registrar sessão" })
      .first();
    await expect(session).toBeVisible();
    await expect(session).toHaveAttribute(
      "href",
      /\/game\/e2e-game-\d+\?session=1/,
    );
  });

  test("journeys have a row in the navigation", async ({ page, context }) => {
    const account = await createAccount("nav");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });
    // Screenshots have had a row since the sidebar was built and one native
    // use in the life of the site; journeys had a hundred and fifty entries
    // and no way in at all. Asserted alongside its neighbour so a sidebar that
    // failed to render cannot pass this by having neither.
    await expect(
      page.getByRole("link", { name: "Jornadas" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Capturas" }).first(),
    ).toBeVisible();
  });

  test("an empty library gets an answer, not three blank shelves", async ({
    page,
    context,
  }) => {
    const account = await createAccount("bare");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR");
    await page.locator("main").first().waitFor({ state: "visible" });
    // A heading over nothing is worse than no heading. Every shelf that reads
    // a library returns null when it has no entries.
    await expect(
      page.getByRole("heading", { name: "Continuar jogando" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Jogam o que você joga" }),
    ).toHaveCount(0);
    // And in the hole they leave, the reason. Nine real accounts sat on this
    // page with nothing on it and no way to find the import.
    await expect(
      page.getByRole("heading", { name: "Sua biblioteca está vazia" }),
    ).toBeVisible();
    await expect(
      page.locator('a[href*="/onboarding/library"]').first(),
    ).toBeVisible();
  });

  test("the first-run step offers the import and lets you leave", async ({
    page,
    context,
  }) => {
    const account = await createAccount("first");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR/onboarding/library");
    await page.locator("main").first().waitFor({ state: "visible" });
    await expect(
      page.getByRole("heading", { name: "Traga sua biblioteca", level: 1 }),
    ).toBeVisible();
    // The import panel itself, reused rather than rebuilt.
    await expect(
      page.getByRole("heading", { name: "Trazer jogos do Backloggd" }),
    ).toBeVisible();
    // The way out matters as much as the offer: a first-run screen that
    // cannot be left is worse than the empty home it is preventing.
    await page.getByRole("link", { name: "Pular por agora" }).click();
    await expect(page).toHaveURL(/\/pt-BR$/);
  });

  test("a stocked library is sent past the first-run step", async ({
    page,
    context,
  }) => {
    const account = await createAccount("past");
    accounts.push(account);
    await giveLibrary(account, [{ game: 20, status: "COMPLETED" }]);
    await signIn(context, account);

    await page.goto("/pt-BR/onboarding/username");
    // Named, dated and stocked: nothing here is unanswered, so this lands on
    // the home page rather than being offered an import it does not need.
    await expect(page).toHaveURL(/\/pt-BR$/);
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
