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

    expect(reached, `the browser reached the database directly`).toEqual([]);
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
