import { expect, test } from "@playwright/test";

test("desktop sidebar resizes, persists and keeps collapse working", async ({
  page,
}, info) => {
  await page.goto("/pt-BR/search");
  const handle = page.getByRole("separator", {
    name: "Largura da barra lateral",
  });
  if (info.project.name.startsWith("mobile")) {
    await expect(handle).toBeHidden();
    return;
  }
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(320, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "320");
  await page.reload();
  await expect(handle).toHaveAttribute("aria-valuenow", "320");
  await expect
    .poll(async () => (await page.locator(".sidebar").boundingBox())?.width)
    .toBe(320);
  await page.locator(".sidebar-collapse-button").click();
  await expect(handle).toBeHidden();
  await expect
    .poll(async () => (await page.locator(".sidebar").boundingBox())?.width)
    .toBe(64);
  await page.locator(".sidebar-collapse-button").click();
  await expect(handle).toBeVisible();
  await expect
    .poll(async () => (await page.locator(".sidebar").boundingBox())?.width)
    .toBe(320);
  await handle.focus();
  await page.keyboard.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
});

test("provider branding and verification controls follow the flat design", async ({
  page,
}) => {
  await page.goto("/pt-BR/login");
  const twitch = page.locator('.provider-grid [data-provider="twitch"]');
  await expect(twitch).toBeVisible();
  const grid = (await page.locator(".provider-grid").boundingBox())!;
  const button = (await twitch.boundingBox())!;
  expect(Math.abs(grid.width - button.width)).toBeLessThan(1);
  expect(
    await twitch.locator("svg").evaluate((el) => getComputedStyle(el).color),
  ).toBe("rgb(145, 70, 255)");
  expect(
    await page
      .locator('.provider-grid [data-provider="discord"] > svg')
      .evaluate((el) => getComputedStyle(el).color),
  ).toBe("rgb(88, 101, 242)");
  expect(await twitch.evaluate((el) => getComputedStyle(el).boxShadow)).toBe(
    "none",
  );
  await page.goto("/pt-BR/verification");
  const apply = page.locator(".verification-apply");
  await apply.hover();
  const style = await apply.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      text: css.textDecorationLine,
      color: css.color,
      shadow: css.boxShadow,
    };
  });
  expect(style).toEqual({
    text: "none",
    color: "rgb(255, 255, 255)",
    shadow: "none",
  });
  await expect(page.locator(".cookie-settings-link > svg")).toBeAttached();
});

test("sidebar identity aligns with the header and its divider reaches both edges", async ({
  page,
}, testInfo) => {
  await page.goto("/pt-BR/search");

  if (testInfo.project.name.startsWith("mobile")) {
    await page.locator(".mobile-menu-button").click();
    await expect(page.locator(".drawer-navigation")).toBeVisible();
    await expect(page.locator(".drawer-navigation").getByRole("link", { name: "Premiações", exact: true })).toBeVisible();
    await expect(
      page.locator(".drawer-navigation").getByText("Carteira"),
    ).toHaveCount(0);
    return;
  }

  await expect(page.locator(".sidebar-brand .brand-logo")).toBeVisible();
  await expect(page.locator(".sidebar-brand .brand span")).toHaveCount(0);
  const layout = await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar")!.getBoundingClientRect();
    const logo = document
      .querySelector(".sidebar-brand .brand-logo")!
      .getBoundingClientRect();
    const collapse = document
      .querySelector(".sidebar-collapse-button")!
      .getBoundingClientRect();
    const account = document
      .querySelector(".sidebar > .sidebar-frame > .account-button")!
      .getBoundingClientRect();
    const divider = getComputedStyle(
      document.querySelector(".sidebar > .sidebar-frame > .account-button")!,
      "::before",
    );
    return {
      accountTop: account.top,
      logoCenter: logo.top + logo.height / 2,
      collapseCenter: collapse.top + collapse.height / 2,
      dividerLeft: account.left + Number.parseFloat(divider.left),
      dividerRight: account.right - Number.parseFloat(divider.right),
      dividerTop: account.top + Number.parseFloat(divider.top),
      sidebarLeft: sidebar.left,
      sidebarRight: sidebar.right,
    };
  });
  const handle = (await page.locator(".sidebar-resize-handle").boundingBox())!;
  expect(handle.y).toBe(0);
  expect(handle.height).toBeGreaterThanOrEqual(await page.evaluate(() => innerHeight - 1));
  expect(layout.logoCenter).toBe(32);
  expect(layout.collapseCenter).toBe(32);
  expect(Math.abs(layout.dividerLeft - layout.sidebarLeft)).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs(layout.dividerRight - layout.sidebarRight),
  ).toBeLessThanOrEqual(1);
  expect(layout.accountTop - layout.dividerTop).toBeGreaterThanOrEqual(8);
});

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
