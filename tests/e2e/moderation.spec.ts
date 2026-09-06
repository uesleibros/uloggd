import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  fileReport,
  makeStaff,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * The moderation console, from where a moderator stands.
 *
 * Everything here needs staff rights, which no signed-in caller can grant
 * itself: `role` is revoked from `authenticated` and the page's own gate asks
 * a definer function. So the specs make a throwaway account, raise it through
 * the service role, and delete it afterwards.
 *
 * They run serially and share one moderator, because raising an account is the
 * slow part and every spec here wants the same one.
 */
test.describe("moderation", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.describe.configure({ mode: "serial" });

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  async function staffed(context: Parameters<typeof signIn>[0]) {
    const moderator = await createAccount("mod");
    accounts.push(moderator);
    await makeStaff(moderator);
    await signIn(context, moderator);
    return moderator;
  }

  test("the queue is closed to everybody who is not staff", async ({
    page,
    context,
  }) => {
    const plain = await createAccount("plain");
    accounts.push(plain);
    await signIn(context, plain);
    await page.goto("/pt-BR/moderation");
    // The gate is `notFound()`, so a non-moderator is told the address does
    // not exist rather than that they are not allowed: the queue does not
    // confirm its own existence to someone who cannot open it.
    await expect(page.locator(".not-found-card")).toBeVisible();
    await expect(page.locator(".moderation-page")).toHaveCount(0);
  });

  test("a report can be read, noted and decided", async ({ page, context }) => {
    const moderator = await staffed(context);
    const offender = await createAccount("offender");
    accounts.push(offender);
    const details = `evidence ${Date.now().toString(36)}`;
    await fileReport(moderator, offender, { details });

    await page.goto("/pt-BR/moderation");
    const card = page
      .locator(".moderation-report-card")
      .filter({ hasText: details });
    await expect(card).toBeVisible();

    // Both sides of the report are named. A queue that says a report exists
    // without saying who it is about is a queue nobody can work from.
    await expect(card).toContainText(offender.username);
    await expect(card).toContainText(moderator.username);

    await card.getByRole("button", { name: /resolver/i }).click();
    await expect(
      page.locator(".moderation-report-card").filter({ hasText: details }),
    ).toBeHidden({ timeout: 15_000 });

    // Decided means decided on the server, not only on screen.
    await page.goto("/pt-BR/moderation?status=RESOLVED");
    await expect(
      page.locator(".moderation-report-card").filter({ hasText: details }),
    ).toBeVisible();
  });

  /**
   * Deciding one report used to throw away everything else on the page.
   *
   * `page.tsx` keyed the console on a string built from every report id and
   * status, so the refresh that followed an action changed the key, React
   * remounted the whole console, and every piece of client state went with it:
   * the account search, the notes typed into other reports, which notes were
   * open. A moderator working a queue lost their place on every click.
   */
  test("deciding one report keeps the rest of the page", async ({
    page,
    context,
  }) => {
    const moderator = await staffed(context);
    // Two targets, not two reports about one: the database allows a reporter
    // only one open report per account, which is the right rule and means a
    // spec that wants two rows needs two people.
    const offender = await createAccount("keeps");
    const other = await createAccount("keeps2");
    accounts.push(offender, other);
    const first = `first ${Date.now().toString(36)}`;
    const second = `second ${Date.now().toString(36)}`;
    await fileReport(moderator, offender, { details: first });
    await fileReport(moderator, other, { details: second });

    await page.goto("/pt-BR/moderation");
    const kept = page
      .locator(".moderation-report-card")
      .filter({ hasText: second });
    await expect(kept).toBeVisible();

    // A note in progress on the report that is not being decided.
    await kept.locator("summary").click();
    const note = kept.locator("textarea");
    await note.fill("halfway through writing this");

    // And a search whose results are the other half of the page.
    const search = page.getByLabel(/buscar usuário/i);
    await search.fill(offender.username);
    await search.press("Enter");
    await expect(page.locator(".moderation-account-card")).toHaveCount(1, {
      timeout: 15_000,
    });

    const refresh = page.waitForResponse(
      (response) =>
        response.url().includes("/moderation") &&
        response.url().includes("_rsc="),
    );
    await page
      .locator(".moderation-report-card")
      .filter({ hasText: first })
      .getByRole("button", { name: /descartar/i })
      .click();
    await expect(
      page.locator(".moderation-report-card").filter({ hasText: first }),
    ).toBeHidden({ timeout: 15_000 });

    // The card disappears on the optimistic update alone, so the refresh that
    // follows it has to be waited for on purpose. That refresh is the moment
    // the page used to be thrown away and rebuilt.
    await refresh;
    await page.waitForTimeout(1200);

    await expect(note).toHaveValue("halfway through writing this");
    await expect(page.locator(".moderation-account-card")).toHaveCount(1);
  });

  test("an account can be banned and unbanned from the console", async ({
    page,
    context,
  }) => {
    await staffed(context);
    const offender = await createAccount("banned");
    accounts.push(offender);

    await page.goto("/pt-BR/moderation");
    const search = page.getByLabel(/buscar usuário/i);
    await search.fill(offender.username);
    await search.press("Enter");
    const card = page.locator(".moderation-account-card").first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /^banir$/i }).click();
    const dialog = page.locator(".moderation-dialog");
    await expect(dialog).toBeVisible();

    // The reason is required, so the confirm stays out of reach until there is
    // one. This is the guard that keeps the audit log worth reading.
    const confirm = dialog.getByRole("button", { name: /confirmar/i });
    await expect(confirm).toBeDisabled();
    await dialog.locator("textarea").fill("repeated harassment");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(card).toContainText(/banido|banned/i);
    await expect(
      card.getByRole("button", { name: /desbanir|unban/i }),
    ).toBeVisible();
  });

  /**
   * The term is written into the address bar so a view can be handed over, and
   * the console is what writes it. When the input owned the term and the
   * console read the server's copy instead, searching for one name and then
   * changing a tab put the previous name back in the URL.
   */
  test("a search survives changing the filter", async ({ page, context }) => {
    const moderator = await staffed(context);
    const offender = await createAccount("urlq");
    accounts.push(offender);
    await fileReport(moderator, offender, { details: `url ${Date.now()}` });

    await page.goto("/pt-BR/moderation");
    const search = page.getByLabel(/buscar usuário/i);
    await search.fill(offender.username);
    await search.press("Enter");
    await expect(page.locator(".moderation-account-card")).toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(page).toHaveURL(new RegExp(`q=${offender.username}`));

    await page.getByRole("tab", { name: /todas/i }).click();
    await expect(page).toHaveURL(/status=ALL/);
    await expect(page).toHaveURL(new RegExp(`q=${offender.username}`));
    await expect(search).toHaveValue(offender.username);
  });

  test("the console fits a phone", async ({ page, context }) => {
    await staffed(context);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/pt-BR/moderation");
    await expect(
      page.locator(".moderation-page:not([aria-busy])"),
    ).toBeVisible();
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
  });
});
