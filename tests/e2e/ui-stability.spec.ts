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

  // Polled rather than asked once. The assertion is about routing and never
  // wavered; what wavered was the connection, which came back ECONNRESET on a
  // run where the server had also logged a stream error of its own. Retrying
  // the request keeps this test answering the question it is about instead of
  // reporting the network.
  await expect
    .poll(async () => (await page.request.get("/pt-BR/feed")).status())
    .toBe(404);

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

test("keeps game sharing visible above the desktop catalog score", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"));
  await page.goto("/pt-BR/game/e2e-game-1");
  await expect(
    page.getByRole("heading", { name: "E2E Game 01" }),
  ).toBeVisible();

  const share = page.locator(".game-stage-share");
  const score = page.locator(".game-stage-rail .game-score-line");
  const rail = page.locator(".game-stage-rail");
  await expect(share).toBeVisible();
  await expect(score).toBeVisible();

  const [shareBox, scoreBox, railBox] = await Promise.all([
    share.boundingBox(),
    score.boundingBox(),
    rail.boundingBox(),
  ]);
  expect(shareBox).not.toBeNull();
  expect(scoreBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(shareBox!.y + shareBox!.height).toBeLessThanOrEqual(scoreBox!.y);
  expect(
    Math.abs(shareBox!.x + shareBox!.width - (railBox!.x + railBox!.width)),
  ).toBeLessThanOrEqual(1);
});

test("contains intrinsic review-editor width inside the mobile sheet", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/pt-BR");
  await page.evaluate(() => {
    const fixture = document.createElement("div");
    fixture.className = "social-editor-dialog review-studio-dialog";
    fixture.setAttribute("data-testid", "review-sheet-fixture");
    fixture.innerHTML = `
      <header><div><span>Editar avaliação</span><h2>The Legend of Zelda: Ocarina of Time</h2></div><button>×</button></header>
      <form class="social-editor-form">
        <nav class="review-section-tabs">
          <button><svg></svg><span>Avaliação</span></button>
          <button><svg></svg><span>Aspectos</span><small>5</small></button>
          <button><svg></svg><span>Detalhes</span></button>
        </nav>
        <div class="review-editor-section">
          <label class="review-title-field"><span>Título <small>15/80</small></span><input value="Primeira Zerada" /></label>
          <div class="review-writing-field">
            <header><b>Sua avaliação</b><small>Markdown básico · menções e spoilers</small></header>
            <div class="md-editor" data-variant="review">
              <div class="md-editor-tabs"><div><button>Escrever</button><button>Visualizar</button></div><button>↗</button></div>
              <div class="md-editor-toolbar">${Array.from({ length: 5 }, () => `<div><button>B</button><button>I</button><button>@</button></div>`).join("")}</div>
              <div class="md-editor-stage"><div class="md-editor-write">jogão</div></div>
            </div>
          </div>
        </div>
        <footer class="review-action-bar"><span class="review-action-status"></span><button>Cancelar</button><button type="submit">Salvar alterações</button></footer>
      </form>`;
    document.body.append(fixture);
  });

  const geometry = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const selectors = [
      "[data-testid='review-sheet-fixture']",
      "[data-testid='review-sheet-fixture'] .social-editor-form",
      "[data-testid='review-sheet-fixture'] .review-editor-section",
      "[data-testid='review-sheet-fixture'] .review-title-field",
      "[data-testid='review-sheet-fixture'] .review-writing-field",
      "[data-testid='review-sheet-fixture'] .md-editor",
    ];
    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      boxes: selectors.map((selector) => {
        const element = document.querySelector(selector) as HTMLElement;
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      }),
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  for (const box of geometry.boxes) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(box.width).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  }
});

test("stacks list identity and metadata on mobile", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/pt-BR");
  const geometry = await page.evaluate(() => {
    const fixture = document.createElement("header");
    fixture.className = "list-detail-header";
    fixture.style.position = "fixed";
    fixture.style.inset = "0 auto auto 0";
    fixture.style.width = "100%";
    fixture.innerHTML = `
      <h1>Jogos Favoritos</h1>
      <a class="list-detail-author"><span>F</span><small>por Filipe Garcia</small></a>
      <div class="list-detail-meta"><span class="list-preview-mode">Coleção</span><small>22 jogos</small></div>`;
    document.body.append(fixture);
    const author = fixture.querySelector(".list-detail-author") as HTMLElement;
    const metadata = fixture.querySelector(".list-detail-meta") as HTMLElement;
    const authorBox = author.getBoundingClientRect();
    const metadataBox = metadata.getBoundingClientRect();
    fixture.remove();
    return {
      authorBottom: authorBox.bottom,
      metadataTop: metadataBox.top,
      metadataLeft: metadataBox.left,
      authorLeft: authorBox.left,
    };
  });

  expect(geometry.metadataTop).toBeGreaterThanOrEqual(geometry.authorBottom);
  expect(geometry.metadataLeft).toBe(geometry.authorLeft);
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
    // The control the "..." button has to line up with. Built rather than
    // found: this page is visited signed out, where the follow button returns
    // null and the edit link belongs to somebody else, so the row genuinely
    // has no second control to measure. The rule still holds and the rule is
    // what is being tested, so the neighbour is stood up from its own CSS the
    // same way the cover below is.
    const neighbourFixture = document.createElement("div");
    neighbourFixture.className = "profile-page";
    neighbourFixture.style.cssText =
      "position:fixed;inset:0 auto auto 0;width:100%;visibility:hidden";
    neighbourFixture.innerHTML =
      '<div class="profile-action-cluster"><div class="profile-follow-control"><button type="button">Seguir</button></div></div>';
    document.body.append(neighbourFixture);
    const neighbourAction = neighbourFixture.querySelector(
      ".profile-follow-control button",
    ) as HTMLElement | null;
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
      neighbourActionHeight:
        neighbourAction?.getBoundingClientRect().height ?? null,
      recentCoverWidth: recentCover?.getBoundingClientRect().width ?? null,
      usesMeteredImageOptimizer: Array.from(document.images).some((image) =>
        image.currentSrc.includes("/_next/image"),
      ),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
    coverFixture?.remove();
    neighbourFixture.remove();
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
  // Pinned to the control beside it rather than to a number. This used to
  // assert 38 and went on failing for fourteen commits after the button was
  // raised to line up with its row, which is a test describing an old
  // decision rather than the rule behind it: the row has to read as one row.
  expect(layout.neighbourActionHeight).not.toBeNull();
  expect(layout.actionHeight).toBe(layout.neighbourActionHeight);
  // And a floor, so "they match" cannot be satisfied by both collapsing.
  expect(layout.actionHeight).toBeGreaterThanOrEqual(38);
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
