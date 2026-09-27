import { expect, test } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

/**
 * Folders: headings over somebody's own lists.
 *
 * Thirty lists is a grid you scroll. A hundred is a filing problem, and the
 * filters beside them cannot solve it: they ask what a list is, never what it
 * is for. A folder is the owner's own answer to the second question, and
 * nothing else: it carries no visibility, and deleting one does not delete
 * the lists that were in it.
 */
test.describe("list folders", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  test.setTimeout(120_000);
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
    accounts.length = 0;
  });

  test("filing a list, and finding it by its folder", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("folders");
    accounts.push(owner);
    await signIn(context, owner);

    const make = async (name: string) => {
      const made = await context.request.post("/api/v1/lists", {
        data: { name },
      });
      expect(made.status(), await made.text()).toBe(201);
      return (await made.json()).data as { id: string; public_id: string };
    };
    const zelda = await make("Zelda por ordem");
    await make("Para comprar");

    const folder = await context.request.post("/api/v1/lists/folders", {
      data: { name: "Séries" },
    });
    expect(folder.status(), await folder.text()).toBe(201);
    const shelf = (await folder.json()).data as { id: string };

    // Asking for the same folder again is that folder, not a second one with
    // the same name.
    const again = await context.request.post("/api/v1/lists/folders", {
      data: { name: "Séries" },
    });
    expect((await again.json()).data.id).toBe(shelf.id);

    const filed = await context.request.patch(`/api/v1/lists/${zelda.id}`, {
      data: { folder_id: shelf.id },
    });
    expect(filed.status(), await filed.text()).toBe(200);

    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    const chips = page.locator(".list-folders-chips");
    await expect(chips).toBeVisible({ timeout: 30_000 });
    await expect(chips).toContainText("Séries");

    const cards = page.locator(".lists-row .list-preview");
    await expect(cards).toHaveCount(2);

    // The folder is a filter, and it is in the address.
    await chips.getByRole("button", { name: /^Séries/ }).click();
    await expect(cards).toHaveCount(1, { timeout: 20_000 });
    await expect(cards.first()).toContainText("Zelda por ordem");
    await expect(page).toHaveURL(/folder=/);

    // And "no folder" is a real answer, not the absence of one.
    await chips.getByRole("button", { name: "Sem pasta" }).click();
    await expect(cards).toHaveCount(1, { timeout: 20_000 });
    await expect(cards.first()).toContainText("Para comprar");

    await chips.getByRole("button", { name: "Todas" }).click();
    await expect(cards).toHaveCount(2, { timeout: 20_000 });

    // Deleting the folder leaves both lists standing.
    const gone = await context.request.delete(
      `/api/v1/lists/folders/${shelf.id}`,
    );
    expect(gone.status()).toBe(200);
    await page.reload();
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(2, {
      timeout: 30_000,
    });
  });

  test("a shelf with nothing on it can still be labelled", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("folderzero");
    accounts.push(owner);
    await signIn(context, owner);

    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    // No lists at all, and the folders are still here: somebody with none is
    // exactly the person who might want to set their shelves up first.
    const manage = page.getByRole("button", { name: "Pastas" });
    await expect(manage).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".lists-empty")).toBeVisible();
    // Nothing is filed, so there is nothing for "unfiled" to mean.
    await expect(
      page.locator(".list-folders-chips").getByRole("button"),
    ).toHaveCount(1);

    await manage.click();
    const dialog = page.locator(".list-folders-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Nenhuma pasta ainda");
    await dialog.getByLabel("Nome da nova pasta").fill("Zelda");
    await dialog.getByRole("button", { name: "Criar" }).click();
    await expect(dialog.locator(".list-folders-rows")).toContainText("Zelda", {
      timeout: 20_000,
    });
    await dialog.getByRole("button", { name: "Fechar" }).click();

    // The empty folder is a chip of its own, counted honestly at nought, and
    // still no "unfiled" chip: there is nothing outside it either.
    const chips = page.locator(".list-folders-chips");
    await expect(chips.getByRole("button", { name: /^Zelda/ })).toContainText(
      "0",
      { timeout: 20_000 },
    );
    await expect(chips.getByRole("button", { name: "Sem pasta" })).toHaveCount(
      0,
    );
  });

  test("two lists, no folders, and the way to make one", async ({
    page,
    context,
  }) => {
    const owner = await createAccount("folderfew");
    accounts.push(owner);
    await signIn(context, owner);
    for (const name of ["Para jogar", "Favoritos"]) {
      const made = await context.request.post("/api/v1/lists", {
        data: { name },
      });
      expect(made.status(), await made.text()).toBe(201);
    }

    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    const manage = page.getByRole("button", { name: "Pastas" });
    await expect(manage).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(2);

    await manage.click();
    const dialog = page.locator(".list-folders-dialog");
    await dialog.getByLabel("Nome da nova pasta").fill("Séries");
    await dialog.getByRole("button", { name: "Criar" }).click();
    await expect(dialog.locator(".list-folders-rows")).toContainText("Séries", {
      timeout: 20_000,
    });
    await dialog.getByRole("button", { name: "Fechar" }).click();

    const chips = page.locator(".list-folders-chips");
    await expect(chips.getByRole("button", { name: /^Séries/ })).toBeVisible({
      timeout: 20_000,
    });
    // Now there is a line to be on either side of, so "unfiled" means
    // something and both lists are still there, under it.
    await expect(
      chips.getByRole("button", { name: "Sem pasta" }),
    ).toBeVisible();
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(2);
  });

  test("a visitor is not offered the filing cabinet", async ({
    page,
    browser,
  }) => {
    const owner = await createAccount("folderhost");
    const visitor = await createAccount("foldervisit");
    accounts.push(owner, visitor);

    const theirs = await browser.newContext();
    await signIn(theirs, owner);
    const made = await theirs.request.post("/api/v1/lists", {
      data: { name: "Pública" },
    });
    expect(made.status()).toBe(201);
    await theirs.request.post("/api/v1/lists/folders", {
      data: { name: "Minhas" },
    });
    await theirs.close();

    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(1, {
      timeout: 30_000,
    });
    // The list is public and readable; how its owner files it is not part of
    // the page somebody else sees.
    await expect(page.getByRole("button", { name: "Pastas" })).toHaveCount(0);
    await expect(page.locator(".list-folders")).toHaveCount(0);
  });

  test("a folder is nobody else's to write in", async ({ browser }) => {
    const owner = await createAccount("folderown");
    const stranger = await createAccount("folderaway");
    accounts.push(owner, stranger);

    const mine = await browser.newContext();
    await signIn(mine, owner);
    const folder = await mine.request.post("/api/v1/lists/folders", {
      data: { name: "Minhas" },
    });
    expect(folder.status(), await folder.text()).toBe(201);
    const shelf = (await folder.json()).data as { id: string };
    await mine.close();

    const theirs = await browser.newContext();
    await signIn(theirs, stranger);
    // Renaming somebody else's folder is not refused with a lecture: through
    // row-level security it is simply not there.
    const renamed = await theirs.request.patch(
      `/api/v1/lists/folders/${shelf.id}`,
      { data: { name: "Roubada" } },
    );
    expect(renamed.status()).toBe(404);
    const deleted = await theirs.request.delete(
      `/api/v1/lists/folders/${shelf.id}`,
    );
    expect(deleted.status()).toBe(404);
    // And their own folders are their own: the listing is the caller's.
    const listed = await theirs.request.get("/api/v1/lists/folders");
    expect((await listed.json()).data).toEqual([]);
    await theirs.close();
  });
});
