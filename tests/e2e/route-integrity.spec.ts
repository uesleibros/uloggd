import { expect, test } from "@playwright/test";

/**
 * Catches the failure mode that took every profile page down: a `select()`
 * whose embed PostgREST cannot resolve. The query answers with an error, the
 * page reads it as "no such row" and falls through to not-found, and nothing
 * upstream notices. TypeScript does not check an embed string and a production
 * build never talks to PostgREST, so both pass on a page that is broken for
 * every visitor.
 *
 * Each test asserts the page's *own* content is present, never that a 404
 * marker is absent. That distinction was measured, not assumed: with the bug
 * reproduced, the not-found markup was not in the response at all, so an
 * "is not 404" assertion passed against a page that rendered nothing.
 */

test("the profile route renders a profile", async ({ page }) => {
  // Discovered from a real link rather than hard-coded, so the test does not
  // depend on any one account continuing to exist.
  await page.goto("/pt-BR");
  const profileLink = page.locator('a[href*="/pt-BR/u/"]').first();
  if ((await profileLink.count()) === 0) {
    test.skip(true, "no profile is linked from home in this environment");
    return;
  }
  const href = await profileLink.getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(href!.split("#")[0]);
  await expect(page.locator(".profile-identity")).toBeVisible({
    timeout: 12_000,
  });
});

test("an unknown profile does not render profile content", async ({ page }) => {
  // The mirror of the test above: without it, a page that renders nothing at
  // all would satisfy the suite for the wrong reason.
  await page.goto("/pt-BR/u/definitely-not-a-real-account-xyz");
  await expect(page.locator(".profile-identity")).toHaveCount(0);
});

test("the catalog search route renders its workspace", async ({ page }) => {
  await page.goto("/pt-BR/search");
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({ timeout: 12_000 });
});

test("home renders its feed shell", async ({ page }) => {
  await page.goto("/pt-BR");
  // `main.` and not just the class. The loading placeholder wears the same
  // class, so while the real page streams in beside it the bare selector
  // matched two elements and the run failed on strict mode — and worse, a
  // slower machine could have satisfied this against the placeholder and
  // called a page that never arrived a pass. Only the real page is a `main`.
  await expect(page.locator("main.home-community-main")).toBeVisible({
    timeout: 12_000,
  });
});
