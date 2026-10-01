import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";

test("game cover opens the shared viewer and restores keyboard focus", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  const cover = page.getByRole("button", { name: "Ver capa do jogo" });
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
