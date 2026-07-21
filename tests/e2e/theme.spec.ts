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

  // Production builds minify #ffffff to #fff; accept both forms.
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--control-focus")
          .trim()
          .toLowerCase(),
      ),
    )
    .toMatch(/^#(?:ffffff|fff)$/);

  const artworkForeground = await page.evaluate(() => {
    const stage = document.createElement("div");
    stage.className = "game-stage";
    const copy = document.createElement("span");
    copy.style.color = "var(--screen-white)";
    stage.append(copy);
    document.body.append(stage);
    const value = getComputedStyle(copy).color;
    stage.remove();
    return value;
  });
  // Page-level artwork stages inherit the selected theme. Only the fullscreen
  // media viewer deliberately pins image controls to a dark palette.
  expect(artworkForeground).toBe("rgb(23, 25, 30)");

  const lightStateColors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      liked: styles.getPropertyValue("--state-liked-text").trim(),
      completed: styles.getPropertyValue("--state-completed-text").trim(),
    };
  });
  expect(lightStateColors).toEqual({
    liked: "#ad294d",
    completed: "#236f48",
  });
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
