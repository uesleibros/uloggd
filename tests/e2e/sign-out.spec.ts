import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  makeStaff,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * Signing out leaves nothing of the account behind.
 *
 * The route cleared the session cookie and that was the whole of it, so the
 * Supabase client in the tab — which still held the session in memory and
 * writes it back whenever it refreshes — put the cookie straight back. The
 * reload that followed was answered as the account that had just left: it
 * bounced off `/login` and came back to a signed-in home page.
 *
 * Two cookies of the proxy's own outlived the session on purpose, one of
 * which is how it skips asking whether somebody is suspended. And the tab
 * remembered whether the reader moderates, under a key with no account in it,
 * so the next account to sign in here inherited the answer.
 */
test.describe("signing out", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("takes the session, the proxy's cookies and the tab's memory", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"));
    // An account, two routes to compile and a full page each side of it.
    test.slow();
    // Staff, so there is something in the tab's memory worth clearing.
    const owner = await createAccount("sgnout");
    accounts.push(owner);
    await makeStaff(owner, "ADMIN");

    const context = await browser.newContext();
    await signIn(context, owner);
    const page = await context.newPage();
    // Visited first so the destination is compiled: under `next dev` that
    // wait is not a wait for the sign-out.
    await page.goto("/pt-BR/login");
    await page.goto("/pt-BR");

    // The menu trigger is a button; the signed-out link in its place is an
    // anchor, and both carry `account-button`.
    await expect(page.locator("button.account-button")).toBeVisible();
    await page.locator("button.account-button").click();
    await page.locator(".account-menu-signout").first().click();

    // Arriving here at all is the regression: signed in, `/login` sends you
    // back to the home page, which is where this used to end up.
    await page.waitForURL(/\/pt-BR\/login$/, { timeout: 60_000 });
    await expect(page.locator("a.account-button")).toBeVisible();
    await expect(page.locator("button.account-button")).toHaveCount(0);

    // Nothing of the account is left: not the session, not the proxy's own
    // two, and not the tab's note about who was reading.
    expect(await context.cookies()).toEqual([]);
    // Polled: the tab forgets when the provider mounts on the signed-out
    // page, which is a moment after the page arrives.
    await expect
      .poll(
        () =>
          page.evaluate(() => window.sessionStorage.getItem("uloggd:staff")),
        { timeout: 15_000 },
      )
      .toBeNull();

    // And it stays signed out on the next page, rather than the client
    // writing the session back a second later.
    await page.goto("/pt-BR");
    await expect(page.locator("a.account-button")).toBeVisible();
    expect(await context.cookies()).toEqual([]);

    await context.close();
  });
});
