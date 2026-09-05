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
});
