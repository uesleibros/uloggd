import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * What a signed-in person can actually do.
 *
 * Everything else in this suite runs anonymous, which is why a whole class of
 * bug reached production untested: "after deleting a comment I cannot comment
 * again" was a client state that only appears once a real write has come back,
 * and no source-level check could see it.
 *
 * These write to the real project, because it is the only database the suite
 * has. So each spec makes its own throwaway account and deletes it afterwards;
 * deleting the auth user cascades through everything keyed to it, so cleanup
 * cannot reach anybody else's rows. Nothing here touches an account it did not
 * create.
 */
test.describe("signed in", () => {
  test.skip(
    !canSignIn,
    "needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and the publishable key",
  );
  // Serial because each spec creates an account, and the rate limits on
  // comments and follows are per account but the database is shared.
  test.describe.configure({ mode: "serial" });

  const accounts: TestAccount[] = [];

  test.afterAll(async () => {
    // Runs even when a spec fails, which is the point: a run that dies must
    // not leave an account behind.
    await Promise.all(accounts.map((account) => destroyAccount(account)));
    accounts.length = 0;
  });

  test("a deleted comment does not lock the composer", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("owner");
    accounts.push(owner);
    await signIn(context, owner);

    await page.goto(`/pt-BR/u/${owner.username}`);
    const composer = page.getByPlaceholder("Adicione algo à conversa…");
    await expect(composer).toBeVisible();

    const first = `first comment ${Date.now()}`;
    await composer.fill(first);
    await page
      .getByRole("button", { name: /coment/i })
      .first()
      .click();
    await expect(page.getByText(first)).toBeVisible();

    // The reported bug lived here. Deleting is armed on the first press and
    // confirmed on the second, so the button is pressed twice; arming only
    // changes its label, from "Excluir" to "Excluir mesmo?", which is why one
    // locator finds it in both states.
    // Whether the row of actions appears at all depends on the viewer, which
    // the client settles after the comment itself is on screen. Waiting for
    // the row rather than for the button is what makes this steady: under a
    // full run the two are far enough apart to matter.
    await expect(page.locator(".profile-comment-actions").first()).toBeVisible({
      timeout: 15_000,
    });
    const remove = page.getByRole("button", { name: /excluir/i }).first();
    await expect(remove).toBeVisible({ timeout: 15_000 });
    await remove.click();
    await remove.click();
    await expect(page.getByText(first)).toBeHidden();

    // The whole point: the composer has to come back on its own. Before the
    // fix, `pending` stayed set because the panel waited for the comment to
    // disappear while the delete only marks it, and every form on the page
    // stayed disabled until a reload.
    const second = `second comment ${Date.now()}`;
    await composer.fill(second);
    const submit = page.getByRole("button", { name: /coment/i }).first();
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();
    await expect(page.getByText(second)).toBeVisible();
  });

  test("settings open on the account and save a change", async ({
    page,
    context,
  }) => {
    const account = await createAccount("prefs");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR/settings?tab=profile");
    // Reaching settings at all is half the test: signed out, the proxy sends
    // this to the login page.
    await expect(page).toHaveURL(/settings/);
    const displayName = page.locator('input[name="displayName"]');
    await expect(displayName).toBeVisible();

    const chosen = `Renamed ${Date.now().toString(36)}`;
    await displayName.fill(chosen);
    await page.getByRole("button", { name: /salvar perfil/i }).click();
    await expect(page.getByText(/salvo|visível para todo mundo/i)).toBeVisible({
      timeout: 15_000,
    });

    // Saved means saved, not "the button said so": the value has to survive a
    // reload, which is where an optimistic message would come apart.
    await page.reload();
    await expect(page.locator('input[name="displayName"]')).toHaveValue(chosen);
  });

  test("the connections tab offers Twitch and Steam to an account with neither", async ({
    page,
    context,
  }) => {
    const account = await createAccount("conn");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR/settings?tab=connections");
    const twitch = page.getByRole("link", { name: /conectar/i }).first();
    await expect(twitch).toBeVisible();
    // A link, not a button: the flow leaves the site, and a button that
    // navigates would be lying about what it does.
    await expect(twitch).toHaveAttribute(
      "href",
      /\/api\/(twitch|steam)\/connect/,
    );
  });

  /**
   * The settings pickers used to be buttons wearing `role="radio"`. They read
   * correctly to a screen reader and behaved like six separate buttons: one
   * tab stop each, and the arrow keys doing nothing. Both halves are checked
   * here, because the roles alone were never the part that was broken.
   */
  test("the settings pickers are groups the arrow keys move within", async ({
    page,
    context,
  }) => {
    const account = await createAccount("radio");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR/settings?tab=preferences");
    const covers = page.getByRole("radiogroup", { name: /capas exibidas/i });
    await expect(covers).toBeVisible();

    const options = covers.getByRole("radio");
    await expect(options).toHaveCount(2);
    const [first, second] = [options.nth(0), options.nth(1)];

    await first.click();
    await expect(first).toHaveAttribute("aria-checked", "true");

    // One tab stop for the group, not one per option: the unselected option
    // is out of the tab order entirely.
    await expect(first).toHaveAttribute("tabindex", "0");
    await expect(second).toHaveAttribute("tabindex", "-1");

    // The keyboard has to save, not merely move the dot. The response is
    // awaited rather than the reload raced against it, because the panel
    // paints the new choice before the request has left.
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/profile") &&
        response.request().method() === "PATCH",
    );
    await first.press("ArrowDown");
    await expect(second).toHaveAttribute("aria-checked", "true");
    await expect(first).toHaveAttribute("aria-checked", "false");
    expect((await saved).ok()).toBe(true);

    await page.reload();
    await expect(
      page
        .getByRole("radiogroup", { name: /capas exibidas/i })
        .getByRole("radio")
        .nth(1),
    ).toHaveAttribute("aria-checked", "true");

    // Privacy uses the same group, and its scopes are three rather than two.
    await page.goto("/pt-BR/settings?tab=privacy");
    const scopes = page.locator(".privacy-scope-options").first();
    await expect(scopes).toHaveAttribute("role", "radiogroup");
    await expect(scopes.getByRole("radio")).toHaveCount(3);

    // The account type dialog has two of these, one nested in the other's
    // answer. The category is optional, and its way back to none used to be
    // tapping the selected chip again, which nothing said and which made a
    // radio that could be unchecked; it is a chip of its own now.
    await page.goto("/pt-BR/settings?tab=general");
    await page
      .locator(".settings-account-card")
      .filter({ hasText: /tipo de conta/i })
      .getByRole("button")
      .first()
      .click();
    const dialog = page.locator(".account-type-dialog");
    await expect(dialog).toBeVisible();

    const kinds = dialog.getByRole("radiogroup").first().getByRole("radio");
    await kinds.nth(0).click();
    await kinds.nth(0).press("ArrowDown");
    await expect(kinds.nth(1)).toHaveAttribute("aria-checked", "true");

    const chips = dialog
      .locator(".account-type-categories .ui-radio-group")
      .getByRole("radio");
    await expect(chips.first()).toHaveText(/nenhuma/i);
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-checked", "true");
    await chips.first().click();
    await expect(chips.first()).toHaveAttribute("aria-checked", "true");
  });

  /**
   * The key lifetime was the last native `<select>` on the site, so it opened
   * with the operating system's dropdown in a page where nothing else does.
   */
  test("the developer key lifetime opens the site's own dropdown", async ({
    page,
    context,
  }) => {
    const account = await createAccount("keys");
    accounts.push(account);
    await signIn(context, account);

    await page.goto("/pt-BR/settings?tab=developer");
    await expect(page.locator("select")).toHaveCount(0);

    const trigger = page.locator(".settings-api-select");
    await expect(trigger).toBeVisible();
    await trigger.click();
    const menu = page.locator(".settings-api-select-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("option", { name: "Nunca" }).click();
    await expect(trigger).toContainText("Nunca");
  });

  /**
   * Fullscreen writing is the one place the layer ladder had been abandoned.
   * The shell took z-index 10000 to cover the page, and then each menu that
   * had to open over it was given a number one higher, one at a time. The
   * tooltip never joined that race, because it comes from the shared
   * primitive, so it was painted underneath the shell and never seen.
   *
   * Asserted through elementFromPoint rather than through visibility:
   * Playwright counts a fully covered element as visible, which is exactly
   * how this survived.
   */
  test("what opens over the fullscreen editor is actually on top", async ({
    page,
    context,
  }) => {
    const account = await createAccount("layer");
    accounts.push(account);
    await signIn(context, account);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto("/pt-BR/settings?tab=profile");
    await page.waitForSelector(".md-editor-toolbar", { timeout: 20_000 });
    await page
      .getByRole("button", { name: /tela cheia/i })
      .first()
      .click();
    await expect(page.locator(".md-editor-fullscreen")).toBeVisible();

    const topmostOf = (selector: string) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return "missing";
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return hit && el.contains(hit) ? "on top" : "covered";
      }, selector);

    await page
      .locator(".md-editor-fullscreen .md-editor-toolbar button")
      .nth(1)
      .hover();
    await expect(page.locator(".app-tooltip")).toBeVisible();
    expect(await topmostOf(".app-tooltip")).toBe("on top");

    await page
      .locator(".md-editor-fullscreen")
      .getByRole("button", { name: /título/i })
      .click();
    await expect(page.locator(".md-heading-menu")).toBeVisible();
    expect(await topmostOf(".md-heading-menu")).toBe("on top");
  });
});
