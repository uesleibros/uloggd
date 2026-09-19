import { expect, test, type Page } from "@playwright/test";

/**
 * A read that fails says it failed.
 *
 * Sections that fetch for themselves used to fall through to their empty state
 * when the request failed: the catalogue said no games matched, a search said
 * nothing was found, a library said it held nothing. Each is a claim about the
 * data the page could not have made, because the data never arrived. These
 * make the API fail on purpose and check the page says so, and that asking
 * again works.
 */

async function failOnce(page: Page, pattern: RegExp) {
  let failed = false;
  await page.route(pattern, async (route) => {
    if (failed) return route.fallback();
    failed = true;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "unavailable", message: "Try again." },
      }),
    });
  });
}

test("the catalogue says its search failed, and retries", async ({ page }) => {
  await failOnce(page, /\/api\/v1\/games(\?|$)/);
  await page.goto("/pt-BR/search");

  const failure = page.locator(".load-error");
  await expect(failure).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".catalog-results-empty")).toHaveCount(0);

  await failure.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator(".catalog-results-grid")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".load-error")).toHaveCount(0);
});

test("a people search says it failed rather than finding nobody", async ({
  page,
}) => {
  await failOnce(page, /\/api\/v1\/search\/people/);
  await page.goto("/pt-BR/search?scope=people&q=a");

  await expect(page.locator(".load-error")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".entity-results-empty")).toHaveCount(0);
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator(".load-error")).toHaveCount(0, { timeout: 15_000 });
});

test("a library that failed to load is not called empty", async ({ page }) => {
  await failOnce(page, /\/api\/v1\/profiles\/[^/]+\/library/);
  await page.goto("/pt-BR/library/UesleiDev");

  const failure = page.locator(".load-error");
  await expect(failure).toBeVisible({ timeout: 15_000 });
  await failure.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator(".load-error")).toHaveCount(0, { timeout: 15_000 });
});
