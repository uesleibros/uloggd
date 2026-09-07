import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  giveLibrary,
  signIn,
  unfinishAccount,
  type TestAccount,
} from "./fixtures/account";

/**
 * The browser asks our API and nothing else.
 *
 * The source-level guard in `tests/unit/browser-uses-the-api.test.mts` catches
 * a component importing the Supabase client. This catches the thing the source
 * cannot show: a request actually leaving the page for the database. If the
 * site can be used without one, the API is complete enough to live on, which
 * is the only proof that matters.
 *
 * Auth is allowed through, and only auth: signing in, refreshing a token and
 * enrolling a factor are an identity provider's job, not ours.
 */
test.describe("the browser goes through the API", () => {
  test.skip(!canSignIn, "needs the Supabase keys");

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  const ROUTES = [
    "/pt-BR",
    "/pt-BR/search",
    "/pt-BR/library/UesleiDev",
    "/pt-BR/game/e2e-game-1",
    "/pt-BR/settings?tab=preferences",
  ];

  test("no page asks the database for data", async ({ page, context }) => {
    const owner = await createAccount("apionly");
    accounts.push(owner);
    await giveLibrary(owner, [{ game: 1, status: "PLAYING" }]);
    await signIn(context, owner);

    const reached: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!/supabase\.co|supabase\.in/.test(url)) return;
      // `/auth/v1/*` is the identity provider. Everything else on that host is
      // the database: `/rest/v1/*` for tables, `/rest/v1/rpc/*` for functions,
      // `/storage/v1/*` for files, `/realtime/v1/*` for subscriptions.
      if (url.includes("/auth/v1/")) return;
      reached.push(`${request.method()} ${url.replace(/\?.*$/, "")}`);
    });

    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(1200);
    }

    for (const route of [
      `/pt-BR/library/${owner.username}`,
      `/pt-BR/wallet/${owner.username}`,
      `/pt-BR/u/${owner.username}/connections`,
      `/pt-BR/u/${owner.username}/year/${new Date().getUTCFullYear()}`,
    ]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
    }

    expect(reached, `the browser reached the database directly`).toEqual([]);
  });

  /**
   * The five "take me to mine" shortcuts.
   *
   * Each one existed to read the viewer's own username and forward, and each
   * read it straight out of `profiles`. They ask `/me` now, which is the same
   * question the API already answers, and the redirect is the cheapest place
   * to prove a server component can live on it.
   */
  test("the shortcuts forward through the API", async ({ page, context }) => {
    const owner = await createAccount("apishort");
    accounts.push(owner);
    await signIn(context, owner);

    for (const section of ["lists", "reviews", "library", "shots", "wallet"]) {
      await page.goto(`/pt-BR/${section}`);
      await expect(page).toHaveURL(
        new RegExp(`/pt-BR/${section}/${owner.username}`),
      );
    }
  });

  /**
   * Onboarding decides where you go from three answers that used to come out
   * of the database: your username, whether the age step is done, and whether
   * the library has anything in it. All three are routes now, and no spec had
   * ever walked this screen, because the fixture names and dates every account
   * it makes.
   */
  test("onboarding still knows where to send an unfinished account", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("apionboard");
    accounts.push(owner);
    await unfinishAccount(owner, { username: true });
    await signIn(context, owner);

    // No username: the screen that asks for one, not a redirect past it.
    await page.goto("/pt-BR/onboarding/username");
    await expect(page).toHaveURL(/onboarding\/username/);
    await expect(page.getByRole("textbox").first()).toBeVisible();

    // And the shortcut sends an unfinished account here rather than to a page
    // it has no name for.
    await page.goto("/pt-BR/lists");
    await expect(page).toHaveURL(/onboarding\/username/);
  });

  test("the level card comes from our own route", async ({ page, context }) => {
    const owner = await createAccount("apilevel");
    accounts.push(owner);
    await signIn(context, owner);

    // It used to call the `profile_level` function through the Supabase
    // client, from the browser, on every page.
    const asked = page.waitForRequest((request) =>
      request.url().includes("/api/v1/profiles/levels"),
    );
    await page.goto("/pt-BR");
    expect((await asked).url()).toContain("/api/v1/profiles/levels?ids=");
  });
});
