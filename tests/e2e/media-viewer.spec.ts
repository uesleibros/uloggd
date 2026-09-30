import { expect, test } from "@playwright/test";

test("the game media viewer shows details and navigates the gallery", async ({
  page,
}) => {
  await page.goto("/pt-BR/game/e2e-game-1");
  await page.getByRole("tab", { name: "Mídia" }).click();
  await page.getByRole("button", { name: "Abrir imagem 1" }).click();

  const viewer = page.getByRole("dialog", { name: "Galeria do jogo" });
  await expect(viewer).toBeVisible();
  await expect(viewer.locator(".media-lightbox-caption")).toContainText(
    "Captura 1",
  );
  await viewer.getByRole("button", { name: "Próxima imagem" }).click();
  await expect(viewer.locator(".media-lightbox-caption")).toContainText(
    "Arte 2",
  );
  await viewer.getByRole("button", { name: "Ampliar imagem" }).click();
  await expect(viewer.locator(".media-lightbox-stage")).toHaveAttribute(
    "data-zoomed",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});
