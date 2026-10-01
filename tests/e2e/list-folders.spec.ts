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
      data: { folder_ids: [shelf.id] },
    });
    expect(filed.status(), await filed.text()).toBe(200);

    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    const chips = page.locator(".list-folders-chips");
    await expect(chips).toBeVisible({ timeout: 30_000 });
    await expect(chips).toContainText("Séries");

    const cards = page.locator(".lists-row .list-preview");
    await expect(cards).toHaveCount(2);

    // The folder is a filter, and it is in the address by its short id
    // rather than by the uuid the row is keyed on.
    await chips.getByRole("button", { name: /^Séries/ }).click();
    await expect(cards).toHaveCount(1, { timeout: 20_000 });
    await expect(cards.first()).toContainText("Zelda por ordem");
    await expect(page).toHaveURL(/folder=[0-9A-Za-z]{8,24}(&|$)/);
    await expect(page).not.toHaveURL(/folder=[0-9a-f]{8}-/);

    // And the list's own page says where it was filed, with a way back to
    // the rest of that folder.
    await page.goto(`/pt-BR/lists/${zelda.public_id}`);
    const inFolder = page.locator(".list-detail-folder");
    await expect(inFolder).toContainText("Séries", { timeout: 30_000 });
    await inFolder.click();
    await expect(page).toHaveURL(/folder=/);
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(1, {
      timeout: 30_000,
    });
    await page.goBack();
    await page.goBack();

    // The count follows the filter, and nothing offers to load the rest of a
    // list that is already whole: it used to keep the number the page was
    // rendered with and print "2 of 2" over one card.
    await expect(page.locator(".lists-toolbar-heading")).toContainText(
      "1 de 2",
    );
    await expect(page.locator(".load-more-row")).toHaveCount(0);

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

  test("one list, two shelves it belongs on", async ({ page, context }) => {
    const owner = await createAccount("foldermany");
    accounts.push(owner);
    await signIn(context, owner);
    const made = await context.request.post("/api/v1/lists", {
      data: { name: "Maratona Zelda 2026" },
    });
    const list = (await made.json()).data as { id: string; public_id: string };
    const folder = async (name: string) => {
      const answer = await context.request.post("/api/v1/lists/folders", {
        data: { name },
      });
      return (await answer.json()).data as { id: string; public_id: string };
    };
    const series = await folder("Séries");
    const year = await folder("2026");

    // Both are true of it, and filing it under one used to mean the other
    // shelf was missing something that belonged on it.
    const filed = await context.request.patch(`/api/v1/lists/${list.id}`, {
      data: { folder_ids: [series.id, year.id] },
    });
    expect(filed.status(), await filed.text()).toBe(200);
    expect((await filed.json()).data.folders).toHaveLength(2);

    await page.goto(`/pt-BR/lists/${list.public_id}`);
    const chips = page.locator(".list-detail-folder");
    await expect(chips).toHaveCount(2, { timeout: 30_000 });
    await expect(chips.nth(0)).toContainText("Séries");
    await expect(chips.nth(1)).toContainText("2026");

    // And it is found under either of them.
    for (const shelf of [series, year]) {
      await page.goto(
        `/pt-BR/lists/${owner.username}?folder=${shelf.public_id}`,
      );
      await expect(page.locator(".lists-row .list-preview")).toHaveCount(1, {
        timeout: 30_000,
      });
    }

    // Taking it out of one leaves it in the other.
    const moved = await context.request.patch(`/api/v1/lists/${list.id}`, {
      data: { folder_ids: [year.id] },
    });
    expect(moved.status()).toBe(200);
    await page.goto(
      `/pt-BR/lists/${owner.username}?folder=${series.public_id}`,
    );
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.goto(`/pt-BR/lists/${owner.username}?folder=${year.public_id}`);
    await expect(page.locator(".lists-row .list-preview")).toHaveCount(1, {
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
    await expect(page.locator(".lists-collection .lists-empty")).toBeVisible();
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

  test("visitors and followers browse permitted folders without private counts or editing controls", async ({
    page,
    browser,
    context,
  }) => {
    const owner = await createAccount("folderhost");
    const visitor = await createAccount("foldervisit");
    accounts.push(owner, visitor);

    const theirs = await browser.newContext();
    await signIn(theirs, owner);
    const make = async (name: string, visibility = "PUBLIC") => {
      const made = await theirs.request.post("/api/v1/lists", {
        data: { name, visibility },
      });
      expect(made.status(), await made.text()).toBe(201);
      return (await made.json()).data as { id: string };
    };
    const publicList = await make("Pública organizada");
    const privateList = await make("Segredo", "PRIVATE");
    const followersList = await make("Só seguidores", "FOLLOWERS");
    await make("Pública sem pasta");
    const folder = async (name: string) => {
      const made = await theirs.request.post("/api/v1/lists/folders", {
        data: { name },
      });
      expect(made.status(), await made.text()).toBe(201);
      return (await made.json()).data as { id: string; public_id: string };
    };
    const year = await folder("2026");
    const series = await folder("Séries");
    const hidden = await folder("Pasta privada");
    const shared = await folder("Seguidores");
    await folder("Vazia");
    for (const [list, folders] of [
      [publicList, [year.id, series.id]],
      [privateList, [year.id, hidden.id]],
      [followersList, [year.id, shared.id]],
    ] as const) {
      const filed = await theirs.request.patch(`/api/v1/lists/${list.id}`, {
        data: { folder_ids: folders },
      });
      expect(filed.status(), await filed.text()).toBe(200);
    }
    await theirs.close();

    const visible = await context.request.get(
      `/api/v1/profiles/${owner.username}/lists/folders`,
    );
    expect(visible.status(), await visible.text()).toBe(200);
    const shelves = await visible.json();
    expect(shelves.unfiled).toBe(1);
    expect(
      shelves.data.map((row: { name: string; lists: number }) => [
        row.name,
        row.lists,
      ]),
    ).toEqual([
      ["2026", 1],
      ["Séries", 1],
    ]);
    await page.goto(`/pt-BR/u/${owner.username}/lists`);
    const cards = page.locator(".lists-row .list-preview");
    const chips = page.locator(".list-folders-chips");
    await expect(cards).toHaveCount(2, {
      timeout: 30_000,
    });
    await expect(
      chips.getByRole("button", { name: "2026 1", exact: true }),
    ).toBeVisible();
    await expect(chips).not.toContainText("Pasta privada");
    await expect(chips).not.toContainText("Vazia");
    await expect(chips).not.toContainText("Seguidores");
    await expect(page.getByRole("button", { name: "Pastas" })).toHaveCount(0);
    await chips.getByRole("button", { name: "2026 1", exact: true }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Pública organizada");
    await page.reload();
    await expect(cards).toHaveCount(1);
    await expect(
      chips.getByRole("button", { name: "2026 1", exact: true }),
    ).toHaveAttribute("data-active", "true");
    await chips.getByRole("button", { name: "Sem pasta" }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Pública sem pasta");

    await signIn(context, visitor);
    await page.goto(
      `/pt-BR/lists/${owner.username}?folder=${series.public_id}`,
    );
    await expect(cards).toHaveCount(1);
    await expect(cards).not.toContainText("Segredo");
    await expect(page.getByRole("button", { name: "Pastas" })).toHaveCount(0);
    const changed = await context.request.patch(
      `/api/v1/lists/folders/${year.public_id}`,
      {
        data: { name: "Alterada por visitante" },
      },
    );
    expect(changed.status()).toBe(404);
    const followed = await context.request.put(
      `/api/v1/social/following/${owner.username}`,
    );
    expect(followed.status(), await followed.text()).toBe(200);
    expect((await followed.json()).data.following).toBe(true);
    await page.goto(`/pt-BR/lists/${owner.username}`);
    await expect(cards).toHaveCount(3);
    await expect(
      chips.getByRole("button", { name: "2026 2", exact: true }),
    ).toBeVisible();
    await expect(
      chips.getByRole("button", { name: "Seguidores 1", exact: true }),
    ).toBeVisible();
    await chips
      .getByRole("button", { name: "Seguidores 1", exact: true })
      .click();
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Só seguidores");
    await page.reload();
    await expect(cards).toHaveCount(1);
    await expect(cards).not.toContainText("Segredo");
    const unfollowed = await context.request.delete(
      `/api/v1/social/following/${owner.username}`,
    );
    expect(unfollowed.status()).toBe(200);
    await page.reload();
    await expect(cards).toHaveCount(0);
    await expect(chips).not.toContainText("Seguidores");
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
