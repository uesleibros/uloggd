import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
} from "./fixtures/account";

test("a real mineral transfer opens the recipient wallet and never looks like a list like", async ({
  page,
  context,
}) => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const sender = await createAccount("mineralfrom");
  const recipient = await createAccount("mineralto");
  try {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
    const { error } = await admin
      .from("mineral_grants")
      .insert({ profile_id: sender.id, level: 2, mineral: "COPPER" });
    expect(error).toBeNull();
    await signIn(context, sender);
    const sent = await context.request.post("/api/v1/minerals/transfers", {
      data: { username: recipient.username, items: { COPPER: 1 } },
    });
    expect(sent.status(), await sent.text()).toBe(201);
    await signIn(context, recipient);
    const inbox = await context.request.get("/api/v1/notifications");
    expect(inbox.status(), await inbox.text()).toBe(200);
    const notification = (await inbox.json()).data.find(
      (row: { kind: string }) => row.kind === "mineral_transfer",
    );
    expect(notification).toMatchObject({
      path: `wallet/${recipient.username}`,
      target_title: "1",
      actor: { username: sender.username },
    });
    for (const [lang, line, wrong] of [
      ["pt-BR", "te enviou minérios", "curtiu sua lista"],
      ["en", "sent you minerals", "liked your list"],
      ["es", "te envió minerales", "le gustó tu lista"],
    ]) {
      await page.goto(`/${lang}`);
      await page.locator(".notification-trigger:visible").click();
      const item = page.locator(".notification-item").filter({ hasText: line });
      await expect(item).toHaveCount(1);
      await expect(item).not.toContainText(wrong);
      await expect(item.locator("svg.lucide-gem")).toHaveCount(1);
      await expect(item).toHaveAttribute(
        "href",
        `/${lang}/wallet/${recipient.username}`,
      );
      await item.click();
      await expect(page).toHaveURL(`/${lang}/wallet/${recipient.username}`);
      await expect(
        page.locator(
          `.wallet-transfer-copy a[href="/${lang}/u/${sender.username}"]`,
        ),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
    await context.clearCookies();
    await page.goto("/pt-BR");
  } finally {
    await destroyAccount(recipient);
    await destroyAccount(sender);
  }
});
