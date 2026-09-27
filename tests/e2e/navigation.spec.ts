import { expect, test } from "@playwright/test";

test("header joins the sidebar and viewport without floating chrome", async ({
  page,
}, testInfo) => {
  await page.goto("/pt-BR/search");
  const mobile = testInfo.project.name.startsWith("mobile");
  const header = page.locator(mobile ? ".mobile-header" : ".content-header");
  await expect(header).toBeVisible();

  const geometry = async () =>
    page.evaluate(
      (selector) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          sidebarRight: document
            .querySelector(".sidebar")!
            .getBoundingClientRect().right,
          contentRight: document
            .querySelector(".platform-content")!
            .getBoundingClientRect().right,
          radius: style.borderRadius,
          shadow: style.boxShadow,
          bottomBorder: style.borderBottomWidth,
        };
      },
      mobile ? ".mobile-header" : ".content-header",
    );

  const initial = await geometry();
  expect(initial.top).toBe(0);
  expect(initial.left).toBe(mobile ? 0 : initial.sidebarRight);
  expect(initial.right).toBe(initial.contentRight);
  expect(initial.radius).toBe("0px");
  expect(initial.shadow).toBe("none");
  expect(initial.bottomBorder).toBe("1px");

  if (!mobile) {
    await page.getByRole("button", { name: "Recolher sidebar" }).click();
    await expect.poll(async () => (await geometry()).left).toBe(64);
    const collapsed = await geometry();
    expect(collapsed.left).toBe(collapsed.sidebarRight);
    expect(collapsed.right).toBe(collapsed.contentRight);
  }
});

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
  if (mobile) {
    // The route can finish hydrating just after the first scroll event. A
    // second downward movement checks the mounted header's actual behavior.
    await expect
      .poll(async () => {
        if ((await header.getAttribute("data-scroll-hidden")) === "true")
          return true;
        await page.evaluate(() =>
          window.scrollBy({ top: 24, behavior: "instant" }),
        );
        return (await header.getAttribute("data-scroll-hidden")) === "true";
      })
      .toBe(true);
  } else {
    await expect(header).toHaveAttribute("data-scroll-hidden", "true");
  }

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
