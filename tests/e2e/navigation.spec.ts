import { expect, test } from "@playwright/test";

test("conceals and reveals the adaptive header without shifting the page", async ({
  page,
}, testInfo) => {
  await page.goto("/pt-BR/search");
  await expect(
    page.locator('.catalog-search-page[data-hydrated="true"]'),
  ).toBeVisible({ timeout: 12_000 });

  const mobile = testInfo.project.name.startsWith("mobile");
  const header = page.locator(mobile ? ".mobile-header" : ".content-header");
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");

  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-scroll-hidden", "true");

  await page.evaluate(() => window.scrollBy({ top: -80, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-scroll-hidden", "false");

  if (!mobile) {
    await page.evaluate(() =>
      window.scrollBy({ top: 100, behavior: "instant" }),
    );
    await expect(header).toHaveAttribute("data-scroll-hidden", "true");
    await page.mouse.move(600, 2);
    await expect(header).toHaveAttribute("data-scroll-hidden", "false");
  } else {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-scroll-hidden", "false");

    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await page.evaluate(() =>
      window.scrollTo({ top: 700, behavior: "instant" }),
    );
    await expect(header).toHaveAttribute("data-scroll-hidden", "true");
  }
});
