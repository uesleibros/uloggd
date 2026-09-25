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
   * The action between doing nothing and taking the account away.
   *
   * Before this the console could only ban, so a first offence had no answer
   * at all, and a ban arrived with no word anywhere: the person found out by
   * being unable to open the site. A warning is nothing but its words, so the
   * test follows them all the way into the other account's inbox.
   */
  test("a warning reaches the account it is about", async ({
    page,
    context,
    browser,
  }) => {
    await staffed(context);
    const offender = await createAccount("warned");
    accounts.push(offender);

    await page.goto("/pt-BR/moderation");
    const search = page.getByLabel(/buscar usuário/i);
    await search.fill(offender.username);
    await search.press("Enter");
    const card = page.locator(".moderation-account-card").first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /^avisar$/i }).click();
    const dialog = page.locator(".moderation-dialog");
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole("button", { name: /confirmar/i });
    await expect(confirm).toBeDisabled();
    await dialog.locator("textarea").fill("spoilers sem aviso, segunda vez");
    await confirm.click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // The warning does not touch the account: it can still use the site, and
    // the console still offers to ban rather than to unban.
    await expect(card.getByRole("button", { name: /^banir$/i })).toBeVisible();

    const theirs = await browser.newContext();
    await signIn(theirs, offender);
    const inbox = await theirs.request.get("/api/v1/notifications");
    expect(inbox.status(), await inbox.text()).toBe(200);
    const notices = (await inbox.json()).data as {
      kind: string;
      target_title: string | null;
    }[];
    expect(notices[0]?.kind).toBe("moderation_warning");
    expect(notices[0]?.target_title).toBe("spoilers sem aviso, segunda vez");

    // And it reads as moderation in the inbox, never as a person: the notice
    // carries the moderator's id, and nothing on screen may carry their name.
    const theirPage = await theirs.newPage();
    await theirPage.goto("/pt-BR");
    // Two bells exist in the markup, one for each header the layout can show,
    // and only one of them is on screen at any width. The unread count is
    // waited for first: it is drawn by the same component once it has read the
    // inbox, so it says the bell is live before anything clicks it.
    const bell = theirPage.locator(".notification-trigger:visible").first();
    await expect(
      theirPage.locator(".notification-badge:visible").first(),
    ).toBeVisible({ timeout: 30_000 });
    await bell.click();
    await expect(theirPage.locator(".notification-dialog")).toBeVisible({
      timeout: 15_000,
    });
    const item = theirPage.locator(".notification-item").first();
    await expect(item).toContainText(/Moderação/i, { timeout: 30_000 });
    await expect(item).not.toContainText(new RegExp(offender.username, "i"));
    await item.click();
    await expect(
      theirPage.locator(".notification-detail-dialog"),
    ).toContainText("spoilers sem aviso, segunda vez");
    await theirs.close();
  });

  /**
   * Removing somebody else's post, from the post itself.
   *
   * Moderation had no way to take down a review, a session or a list at all:
   * only comments and screenshots had a removal function behind them, so an
   * admin reading a page of spam could ban the account and watch what it
   * wrote stay on the front page.
   */
  test("staff can take a review down from the page it is on", async ({
    page,
    context,
    browser,
  }) => {
    await staffed(context);
    const offender = await createAccount("spammer");
    accounts.push(offender);
    const theirs = await browser.newContext();
    await signIn(theirs, offender);
    const made = await theirs.request.post("/api/v1/reviews", {
      data: {
        igdb_id: 1074,
        game_slug: "super-mario-bros",
        content: "spam que ninguém pediu",
        rating: 80,
        rating_mode: "score_100",
        visibility: "PUBLIC",
      },
    });
    expect(made.status(), await made.text()).toBe(201);
    const review = (await made.json()).data as { public_id: string };

    await page.goto(`/pt-BR/review/${review.public_id}`);
    const remove = page.locator(".staff-remove-action");
    await expect(remove).toBeVisible({ timeout: 20_000 });

    // Two presses, like every other removal on the site.
    await remove.click();
    await expect(remove).toHaveAttribute("data-armed", "true");
    await remove.click();
    await expect(page).toHaveURL(/\/game\/super-mario-bros/, {
      timeout: 20_000,
    });

    // Gone, and the author was told why by the same inbox that carries a ban.
    const gone = await theirs.request.get(
      `/api/v1/reviews/${review.public_id}`,
    );
    expect(gone.status()).toBe(404);
    const inbox = await theirs.request.get("/api/v1/notifications");
    const notices = (await inbox.json()).data as { kind: string }[];
    expect(
      notices.some((one) => one.kind === "moderation_review_removed"),
    ).toBe(true);
    await theirs.close();
  });

  /**
   * The same control, wherever the post is drawn.
   *
   * Staff removal started life on three detail pages, because each page had to
   * be told who was reading it. A feed card is four components away from
   * anything that knows that, so the control now asks for itself and every
   * surface that draws a post draws the removal with it.
   */
  test("the removal follows the content, and only for staff", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const moderator = await createAccount("everymod");
    accounts.push(moderator);
    await makeStaff(moderator);
    const offender = await createAccount("everybad");
    accounts.push(offender);

    const theirs = await browser.newContext();
    await signIn(theirs, offender);
    const review = (
      await (
        await theirs.request.post("/api/v1/reviews", {
          data: {
            igdb_id: 1074,
            game_slug: "super-mario-bros",
            content: "conteúdo para moderar",
            rating: 80,
            rating_mode: "score_100",
            visibility: "PUBLIC",
          },
        })
      ).json()
    ).data as { public_id: string };
    const list = (
      await (
        await theirs.request.post("/api/v1/lists", {
          data: { name: "lista para moderar", visibility: "PUBLIC" },
        })
      ).json()
    ).data as { public_id: string };

    const places = [
      `/pt-BR/u/${offender.username}`,
      `/pt-BR/review/${review.public_id}`,
      `/pt-BR/lists/${list.public_id}`,
      `/pt-BR/lists/${offender.username}`,
    ];

    const staffContext = await browser.newContext();
    await signIn(staffContext, moderator);
    const staffPage = await staffContext.newPage();
    for (const place of places) {
      await staffPage.goto(place);
      await expect(
        staffPage.locator(".staff-remove-action").first(),
        `no removal on ${place}`,
      ).toBeAttached({ timeout: 20_000 });
    }
    await staffContext.close();

    // And nobody else sees it, on any of them.
    const readerPage = await theirs.newPage();
    for (const place of places) {
      await readerPage.goto(place);
      await readerPage.waitForTimeout(1500);
      expect(
        await readerPage.locator(".staff-remove-action").count(),
        `a removal leaked on ${place}`,
      ).toBe(0);
    }
    await theirs.close();
  });

  /**
   * Taking content down without waiting for a report about that exact piece.
   *
   * The only door to a comment used to be a report naming it, so an account
   * posting the same thing forty times kept the forty unless forty people
   * flagged them.
   */
  test("content can be removed straight from the account", async ({
    page,
    context,
    browser,
  }) => {
    await staffed(context);
    const offender = await createAccount("poster");
    accounts.push(offender);
    const theirs = await browser.newContext();
    await signIn(theirs, offender);
    const written = await theirs.request.post("/api/v1/comments", {
      data: {
        on: "profile",
        id: offender.username,
        body: "conteúdo que ninguém denunciou",
      },
    });
    expect(written.status(), await written.text()).toBe(201);

    await page.goto("/pt-BR/moderation");
    const search = page.getByLabel(/buscar usuário/i);
    await search.fill(offender.username);
    await search.press("Enter");
    const card = page.locator(".moderation-account-card").first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /conteúdo/i }).click();
    const row = card
      .locator(".moderation-written-row")
      .filter({ hasText: "conteúdo que ninguém denunciou" });
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole("button", { name: /remover/i }).click();
    const dialog = page.locator(".moderation-dialog");
    await expect(dialog).toContainText(/nenhuma denúncia|não há denúncia/i);
    await dialog.getByRole("button", { name: /^remover$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(row).toHaveAttribute("data-removed", "true");

    // Gone for everybody, and the author was told why.
    const inbox = await theirs.request.get("/api/v1/notifications");
    const notices = (await inbox.json()).data as { kind: string }[];
    expect(
      notices.some((one) => one.kind === "moderation_comment_removed"),
    ).toBe(true);
    await theirs.close();
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

  /**
   * A removed post leaves the list it was removed from.
   *
   * Every removal control asked the router to refresh, which redraws the
   * server components of the current route and nothing else. Where a feed is
   * a server component that is the whole story, and where it is not — the
   * home feed, the search results, a post's comments, all of which fetch
   * their own rows and hold them in state — the post came back from the
   * database gone and stayed on screen until somebody reloaded the page.
   */
  test("a removed review leaves a list that fetched it itself", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const moderator = await createAccount("livemod");
    accounts.push(moderator);
    await makeStaff(moderator);
    const offender = await createAccount("livebad");
    accounts.push(offender);

    const theirs = await browser.newContext();
    await signIn(theirs, offender);
    // A word nothing else can match, so the search returns this and only this.
    const marker = `zzmoderar${Date.now().toString(36)}`;
    const made = await theirs.request.post("/api/v1/reviews", {
      data: {
        igdb_id: 1074,
        game_slug: "super-mario-bros",
        content: `uma resenha ${marker} para remover ao vivo`,
        rating: 80,
        rating_mode: "score_100",
        visibility: "PUBLIC",
      },
    });
    expect(made.status(), await made.text()).toBe(201);

    const staffContext = await browser.newContext();
    await signIn(staffContext, moderator);
    const page = await staffContext.newPage();
    // The reviews scope is searched from the browser, so these rows live in
    // the page's own state rather than in the server's render of the route.
    await page.goto(
      `/pt-BR/search?scope=reviews&q=${encodeURIComponent(marker)}`,
    );
    const card = page.locator(".entity-search-reviews article").first();
    await expect(card).toBeVisible({ timeout: 30_000 });

    const remove = page.locator(".staff-remove-action").first();
    await expect(remove).toBeVisible({ timeout: 20_000 });
    await remove.click();
    await expect(remove).toHaveAttribute("data-armed", "true");
    await remove.click();

    // No reload anywhere in here: the list has to notice on its own.
    await expect(page.locator(".entity-search-reviews article")).toHaveCount(
      0,
      { timeout: 30_000 },
    );

    await staffContext.close();
    await theirs.close();
  });
});
