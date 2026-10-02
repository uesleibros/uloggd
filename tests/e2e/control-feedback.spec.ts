import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";

test("password fields explain their input and profile text grows without manual resizing", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const account = await createAccount("inputfeedback");
  try {
    await signIn(context, account);
    await page.goto("/pt-BR/settings?tab=security");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input[name="password"]:visible')).toHaveAttribute(
      "placeholder",
      "Pelo menos 8 caracteres, uma letra e um número",
    );
    await expect(
      page.locator('input[name="confirm"][type="password"]:visible'),
    ).toHaveAttribute("placeholder", "Digite a senha novamente");
    await page.goto("/pt-BR/settings?tab=profile");
    await page.waitForLoadState("networkidle");
    const bio = page.locator('textarea[name="bio"]');
    await bio.fill("A short bio");
    await expect(bio).toHaveCSS("resize", "none");
    const initial = await bio.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    await bio.fill(
      Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n"),
    );
    await expect
      .poll(() => bio.evaluate((node) => node.getBoundingClientRect().height))
      .toBeGreaterThan(initial);
    await bio.fill("Short again");
    await expect
      .poll(() => bio.evaluate((node) => node.getBoundingClientRect().height))
      .toBeLessThanOrEqual(initial + 1);
  } finally {
    await destroyAccount(account);
  }
});

test("game cover opens the shared viewer and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  const cover = page.getByRole("button", { name: "Ver capa do jogo" });
  await cover.hover();
  await expect
    .poll(() => cover.evaluate((node) => getComputedStyle(node).transform))
    .toBe("matrix(1.025, 0, 0, 1.025, 0, 0)");
  await cover.click();
  const viewer = page.getByRole("dialog", { name: "E2E Game 01", exact: true });
  await expect(viewer).toBeVisible();
  await expect(
    viewer.getByRole("link", { name: "Abrir imagem original" }),
  ).toHaveAttribute("href", "/logo.jpg");
  await viewer.getByRole("button", { name: "Ampliar imagem" }).click();
  await expect(viewer.locator(".media-lightbox-stage")).toHaveAttribute(
    "data-zoomed",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(cover).toBeFocused();
});

test("tabs use a flat surface and an active underline", async ({ page }) => {
  for (const url of ["/pt-BR/game/e2e-game-1", "/pt-BR/search?scope=reviews"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const rail = page.locator(".app-tabs").first();
    const active = rail.locator(
      ':is(button[aria-selected="true"], a[aria-current="page"])',
    );
    await expect(active).toBeVisible();
    await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(active).toHaveCSS("border-bottom-width", "2px");
    const inactive = rail
      .locator(':is(button[aria-selected="false"], a:not([aria-current]))')
      .first();
    await inactive.hover();
    await expect(inactive).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    for (const [theme, colour] of [
      ["light", "rgb(72, 85, 214)"],
      ["dark", "rgb(121, 131, 245)"],
    ]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      await page.mouse.move(0, 0);
      await inactive.hover();
      await expect(inactive).toHaveCSS("color", colour);
    }
  }
});

test("a card rating stays legible on the cover without repeating below it", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const account = await createAccount("ratingcontrast");
  try {
    await signIn(context, account);
    const written = await page.request.post("/api/v1/library", {
      data: {
        igdb_id: 900001,
        game_slug: "e2e-game-1",
        status: "COMPLETED",
        rating: 70,
      },
    });
    expect(written.status(), await written.text()).toBe(200);
    await page.goto(`/pt-BR/library/${account.username}`);
    const card = page.locator(".quick-game-card").first();
    await expect(card).toBeVisible();
    const rating = card.locator(".quick-card-details > span");
    await expect(rating).toContainText("3,5/5");
    await expect(card.locator(".quick-card-meta")).not.toContainText("3,5/5");
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      await card.hover();
      await expect(card.locator(".quick-card-details")).toHaveCSS(
        "opacity",
        "1",
      );
      await expect(rating).toHaveCSS("color", "rgb(255, 224, 138)");
      await expect(rating).toHaveCSS("background-color", "rgba(7, 6, 9, 0.88)");
    }
    const wallet = page.locator(".header-wallet-link:visible").first();
    await wallet.hover();
    await expect(wallet).toHaveCSS("color", "rgb(121, 131, 245)");
  } finally {
    await destroyAccount(account);
  }
});

test("text links share the lilac accent in both themes", async ({ page }) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  const credit = page.locator(".game-title-company-link:visible").first();
  await expect(credit).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await credit.hover();
    await expect
      .poll(() => credit.evaluate((node) => getComputedStyle(node).color))
      .toBe(theme === "light" ? "rgb(72, 85, 214)" : "rgb(121, 131, 245)");
  }
});

test("cover choices keep selection feedback without a hover frame", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-2");
  await page.getByRole("button", { name: /Alterar capa/ }).click();
  const choice = page.locator(".cover-modal-grid > button").nth(1);
  await choice.hover();
  expect(
    await choice.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).toBe("none");
  const image = choice.locator(".cover-modal-image");
  const border = await image.evaluate(
    (node) => getComputedStyle(node).borderColor,
  );
  await choice.click();
  await expect(choice).toHaveAttribute("data-active", "true");
  expect(
    await image.evaluate((node) => getComputedStyle(node).borderColor),
  ).not.toBe(border);
});

test("a game favourite keeps its colour without a generic hover outline", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const account = await createAccount("feedback");
  try {
    await signIn(context, account);
    await page.goto("/pt-BR/game/e2e-game-1");
    const favourite = page.locator('button[data-action="liked"]:visible');
    await expect(favourite).toHaveAttribute("aria-pressed", "false");
    await favourite.hover();
    expect(
      await favourite.evaluate((node) => getComputedStyle(node).outlineStyle),
    ).toBe("none");
    await favourite.click();
    await expect(favourite).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("heading", { level: 1 }).click();
    await favourite.hover();
    expect(
      await favourite.evaluate((node) => getComputedStyle(node).outlineStyle),
    ).toBe("none");
  } finally {
    await destroyAccount(account);
  }
});
