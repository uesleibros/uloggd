import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) =>
    console.error(`[browser error] ${error.stack}`),
  );
});

test("keeps the advanced-filter sheet themed and inside the mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.addInitScript(() => localStorage.setItem("uloggd:theme", "light"));
  await page.goto("/pt-BR/search");
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({ timeout: 12_000 });

  await page.getByRole("button", { name: "Filtros avançados" }).click();
  const dialog = page.locator(".catalog-filter-dialog");
  const footer = page.locator(".catalog-filter-dialog-actions");
  await expect(dialog).toBeVisible();
  await expect(footer).toBeVisible();

  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector(
      ".catalog-filter-dialog",
    ) as HTMLElement;
    const footer = document.querySelector(
      ".catalog-filter-dialog-actions",
    ) as HTMLElement;
    const overlay = document.querySelector(
      ".catalog-filter-overlay",
    ) as HTMLElement;
    const dialogBox = dialog.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const styles = getComputedStyle(dialog);
    return {
      dialogTop: dialogBox.top,
      dialogBottom: dialogBox.bottom,
      footerBottom: footerBox.bottom,
      viewportHeight: window.innerHeight,
      background: styles.backgroundColor,
      foreground: styles.color,
      dialogAnimationDuration: styles.animationDuration,
      overlayAnimationDuration: getComputedStyle(overlay).animationDuration,
    };
  });

  expect(geometry.dialogTop).toBeGreaterThanOrEqual(0);
  expect(geometry.dialogBottom).toBeLessThanOrEqual(
    geometry.viewportHeight + 1,
  );
  expect(geometry.footerBottom).toBeLessThanOrEqual(
    geometry.viewportHeight + 1,
  );
  expect(geometry.background).toBe("rgb(255, 255, 255)");
  expect(geometry.foreground).toBe("rgb(23, 25, 30)");
  expect(geometry.dialogAnimationDuration).toBe("0.22s");
  expect(geometry.overlayAnimationDuration).toBe("0.18s");
});

test("keeps profile identity, metadata, and actions in their responsive contract", async ({
  page,
}, testInfo) => {
  await page.goto("/pt-BR/u/UesleiDev");
  const profile = page.locator(".profile-page");
  await expect(profile).toBeVisible();
  await expect(page.locator(".profile-meta-row")).toBeVisible();
  await expect(page.locator(".profile-action-cluster")).toBeVisible();

  const layout = await page.evaluate(() => {
    const identity = document.querySelector(".profile-identity") as HTMLElement;
    const actions = document.querySelector(
      ".profile-action-cluster",
    ) as HTMLElement;
    const identityBox = identity.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    return {
      identityLeft: identityBox.left,
      identityRight: identityBox.right,
      actionsLeft: actionsBox.left,
      actionsRight: actionsBox.right,
      actionPosition: getComputedStyle(actions).position,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.actionsLeft).toBeGreaterThanOrEqual(layout.identityLeft);
  expect(layout.actionsRight).toBeLessThanOrEqual(layout.identityRight + 1);
  expect(layout.actionPosition).toBe(
    testInfo.project.name.startsWith("mobile") ? "static" : "absolute",
  );
});
