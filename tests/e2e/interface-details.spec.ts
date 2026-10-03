import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";

test("list metadata, session width and level dialog retain their layout", async ({
  page,
  context,
}, info) => {
  test.skip(!canSignIn, "needs Supabase credentials");
  test.setTimeout(120_000);
  const owner = await createAccount("layout");
  try {
    await signIn(context, owner);
    for (const kind of ["COLLECTION", "TIERLIST"]) {
      const response = await context.request.post("/api/v1/lists", {
        data: { name: `No description ${kind}`, kind },
      });
      expect(response.status(), await response.text()).toBe(201);
      const list = (await response.json()).data;
      await page.goto(`/pt-BR/lists/${list.public_id}`);
      await expect(page.locator(".list-detail-meta:visible")).toBeVisible();
      const author = (await page
        .locator(".list-detail-author:visible")
        .boundingBox())!;
      const meta = (await page
        .locator(".list-detail-meta:visible")
        .boundingBox())!;
      expect(meta.y).toBeGreaterThanOrEqual(author.y + author.height);
    }
    const logged = await context.request.post("/api/v1/journal/entries", {
      data: {
        igdb_id: 900001,
        game_slug: "e2e-game-1",
        minutes: 15,
        played_on: "2026-01-01",
        note: "Session layout",
      },
    });
    expect(logged.status(), await logged.text()).toBe(201);
    const entry = (await logged.json()).data;
    await page.goto(`/pt-BR/entry/${entry.public_id || entry.id}`);
    await expect(page.locator(".diary-entry-card")).toBeVisible();
    const main = (await page.locator(".diary-entry-page").boundingBox())!;
    const content = (await page.locator(".platform-content").boundingBox())!;
    expect(Math.abs(main.width - content.width)).toBeLessThan(2);
    await page.goto(`/pt-BR/u/${owner.username}`);
    const badge = page.locator(".profile-verified-title .level-badge");
    await badge.click();
    const dialog = page.locator(".level-dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => getComputedStyle(el).textAlign)).toBe(
      "left",
    );
    await expect
      .poll(
        async () =>
          (await dialog.locator(".level-dialog-ring").boundingBox())!.width,
      )
      .toBeCloseTo(48, 1);
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    await page.screenshot({
      path: `test-results/level-${info.project.name}.png`,
    });
  } finally {
    await destroyAccount(owner);
  }
});
