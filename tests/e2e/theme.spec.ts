import { expect, test } from "@playwright/test";

test("applies a saved theme before the interface becomes interactive", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("uloggd:theme", "light"));
  await page.goto("/pt-BR/search");

  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme-preference", "light");
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--console-canvas")
          .trim(),
      ),
    )
    .toBe("#f5f6f8");
});

test("automatic theme follows device appearance changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("uloggd:theme", "auto"));
  await page.goto("/pt-BR/search");

  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme-preference", "auto");
  await expect(root).toHaveAttribute("data-theme", "dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-theme", "light");
});
