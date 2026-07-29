import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) =>
    console.error(`[browser error] ${error.stack}`),
  );
});

test("uses Home as the community destination without a separate Feed", async ({
  page,
}, testInfo) => {
  await page.goto("/pt-BR");

  await expect(
    page.getByRole("heading", {
      name: "Jogos ficam melhores quando viram conversa.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Avaliações recentes" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Em breve" })).toBeVisible();
  await expect(page.locator(".discovery-games")).toHaveCount(3);
  await expect(
    page.locator(".discovery-games .shelf-carousel-track"),
  ).toHaveCount(3);

  if (!testInfo.project.name.startsWith("mobile")) {
    const upcomingTrack = page
      .getByRole("heading", { name: "Em breve" })
      .locator("xpath=ancestor::section[contains(@class, 'discovery-lane')]")
      .locator(".shelf-carousel-track");
    await page.getByRole("button", { name: "Em breve: próximo" }).click();
    await expect
      .poll(() => upcomingTrack.evaluate((node) => node.scrollLeft))
      .toBeGreaterThan(0);
  }

  const firstReview = page
    .locator(".home-reviews-section .activity-entry[data-kind='review']")
    .first();
  if ((await firstReview.count()) > 0) {
    await expect(firstReview.locator(".activity-avatar")).toBeVisible();
  }
  await expect(page.locator('a[href="/pt-BR/feed"]')).toHaveCount(0);

  const width = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);

  const response = await page.request.get("/pt-BR/feed");
  expect(response.status()).toBe(404);

  await page.goto("/pt-BR/u/route-contract/library");
  await expect(page).toHaveURL("/pt-BR/library/route-contract");
});

test("opens shared menus without composition errors and preserves motion", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/pt-BR");
  // Both navigation variants stay mounted for responsive continuity. This
  // desktop-only test must target the visible header instead of whichever
  // trigger happens to come first in DOM order.
  const languageTrigger = page.locator(
    ".content-header .locale-switcher-trigger",
  );
  await expect(languageTrigger).toBeVisible();
  await languageTrigger.click();

  const menu = page.locator(".locale-menu");
  await expect(menu).toBeVisible();
  await expect(languageTrigger).toHaveAttribute("data-popup-open", "");
  await expect(menu).toHaveAttribute("data-open", "");
  expect(
    await menu.evaluate(
      (element) => getComputedStyle(element).animationDuration,
    ),
  ).toBe("0.15s");
  expect(errors).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  expect(errors).toEqual([]);
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
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });

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
    geometry.viewportHeight + 2,
  );
  expect(geometry.footerBottom).toBeLessThanOrEqual(
    geometry.viewportHeight + 2,
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
    const moreActions = document.querySelector(
      ".profile-action-cluster .profile-more-trigger",
    ) as HTMLElement;
    let recentCover = document.querySelector(
      ".profile-shelf .quick-game-card",
    ) as HTMLElement | null;
    let coverFixture: HTMLElement | null = null;
    if (!recentCover) {
      coverFixture = document.createElement("div");
      coverFixture.className = "profile-page";
      coverFixture.style.cssText =
        "position:fixed;inset:0 auto auto 0;width:100%;visibility:hidden";
      coverFixture.innerHTML =
        '<section class="profile-shelf"><div class="cover-shelf"><article class="quick-game-card"></article></div></section>';
      document.body.append(coverFixture);
      recentCover = coverFixture.querySelector(".quick-game-card");
    }
    const identityBox = identity.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    const result = {
      identityLeft: identityBox.left,
      identityRight: identityBox.right,
      actionsLeft: actionsBox.left,
      actionsRight: actionsBox.right,
      actionPosition: getComputedStyle(actions).position,
      actionHeight: moreActions.getBoundingClientRect().height,
      recentCoverWidth: recentCover?.getBoundingClientRect().width ?? null,
      usesMeteredImageOptimizer: Array.from(document.images).some((image) =>
        image.currentSrc.includes("/_next/image"),
      ),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
    coverFixture?.remove();
    return result;
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  if (testInfo.project.name.startsWith("mobile")) {
    expect(layout.actionsLeft).toBeGreaterThanOrEqual(0);
    expect(layout.actionsRight).toBeLessThanOrEqual(layout.viewportWidth + 1);
  } else {
    expect(layout.actionsLeft).toBeGreaterThanOrEqual(layout.identityLeft);
    expect(layout.actionsRight).toBeLessThanOrEqual(layout.identityRight + 1);
  }
  expect(layout.actionPosition).toBe(
    testInfo.project.name.startsWith("mobile") ? "static" : "absolute",
  );
  expect(layout.actionHeight).toBe(38);
  expect(layout.usesMeteredImageOptimizer).toBe(false);
  expect(layout.recentCoverWidth).not.toBeNull();
  expect(layout.recentCoverWidth!).toBeLessThanOrEqual(
    testInfo.project.name.startsWith("mobile") ? 104 : 144,
  );
});

test("keeps connection search available across follower tabs", async ({
  page,
}) => {
  await page.goto("/pt-BR/u/UesleiDev/connections?tab=followers");
  const search = page.getByRole("searchbox", { name: "Buscar conexões" });
  await expect(search).toBeVisible();
  await search.fill("Ueslei");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/tab=followers/);
  await expect(page).toHaveURL(/q=Ueslei/);
});
