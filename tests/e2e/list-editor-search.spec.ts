import { expect, test, type Page, type Route } from "@playwright/test";
import {
  canSignIn,
  createAccount,
  destroyAccount,
  signIn,
  type TestAccount,
} from "./fixtures/account";

function game(number: number, releaseTimestamp: number | null = null) {
  return {
    id: 900_000 + number,
    slug: `e2e-game-${number}`,
    name: `E2E Game ${String(number).padStart(2, "0")}`,
    coverUrl: "/e2e-missing-custom-cover.jpg",
    fallbackCoverUrl: "/logo.jpg",
    releaseTimestamp,
  };
}

async function answer(route: Route, results = [game(1)]) {
  await route.fulfill({ json: { results, people: [] } });
}

test.describe("catalogue search in list editors", () => {
  test.skip(!canSignIn, "needs the Supabase keys");
  const accounts: TestAccount[] = [];
  test.afterAll(async () => {
    await Promise.all(accounts.map(destroyAccount));
  });

  async function open(page: Page, kind: "COLLECTION" | "TIERLIST") {
    const account = await createAccount("listsearch");
    accounts.push(account);
    await signIn(page.context(), account);
    const response = await page.request.post("/api/v1/lists", {
      data: { name: "Search regression", kind },
    });
    expect(response.status(), await response.text()).toBe(201);
    const list = (await response.json()).data;
    await page.goto(`/pt-BR/lists/${list.public_id}?edit=1`);
    if (kind === "COLLECTION")
      await page
        .getByRole("button", { name: "Adicionar jogos", exact: true })
        .click();
    const input = page.getByRole("textbox", {
      name:
        kind === "COLLECTION"
          ? "Buscar jogos para adicionar"
          : "Buscar jogos na biblioteca e no catálogo",
    });
    await expect(input).toBeVisible();
    return input;
  }

  for (const kind of ["COLLECTION", "TIERLIST"] as const) {
    test(`${kind} discards obsolete answers and retries failures`, async ({
      page,
    }) => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let fail = true;
      await page.route("**/api/igdb/search?**", async (route) => {
        const url = new URL(route.request().url());
        expect(url.searchParams.get("scope")).toBe("games");
        if (url.searchParams.get("q") === "held") {
          await held;
          await answer(route, [game(2)]);
        } else if (url.searchParams.get("q") === "failure" && fail) {
          await route.fulfill({ status: 503, json: { error: "unavailable" } });
        } else await answer(route);
      });
      const input = await open(page, kind);
      const choices = page.locator(
        kind === "COLLECTION"
          ? ".list-add-game-row"
          : ".tierlist-pool-catalog .tierlist-cover-add",
      );
      await input.fill("first");
      await expect(choices).toHaveCount(1);
      await expect(choices.locator("img")).toHaveAttribute(
        "src",
        /\/logo\.jpg$/,
      );
      const pending = page.waitForRequest(
        (request) => new URL(request.url()).searchParams.get("q") === "held",
      );
      await input.fill("held");
      try {
        // The next answer is held back so the old answer cannot disappear just
        // because an assertion waited long enough for the new request to finish.
        await expect(choices).toHaveCount(0);
        await pending;
        const aborted = page.waitForEvent(
          "requestfailed",
          (request) => new URL(request.url()).searchParams.get("q") === "held",
        );
        await input.fill("");
        await aborted;
        await expect(choices).toHaveCount(0);
      } finally {
        release();
      }
      await input.fill("failure");
      const alert = page
        .getByRole("alert")
        .filter({ hasText: "Não foi possível carregar" });
      await expect(alert).toContainText("Não foi possível carregar");
      await expect(
        page.getByText("Nenhum jogo encontrado.", { exact: true }),
      ).toBeHidden();
      await expect(
        page.getByText("Nada encontrado.", { exact: true }),
      ).toBeHidden();
      fail = false;
      await alert.getByRole("button", { name: "Tentar de novo" }).click();
      await expect(choices).toHaveCount(1);
      await expect(alert).toBeHidden();
      await expect(choices.locator("img")).toHaveAttribute(
        "src",
        /\/logo\.jpg$/,
      );
    });
  }

  test("tier sorting retains dates from newly added catalogue games", async ({
    page,
  }) => {
    await page.route("**/api/igdb/search?**", (route) =>
      answer(route, [game(1, null), game(2, 100), game(3, -100)]),
    );
    const input = await open(page, "TIERLIST");
    await input.fill("E2E");
    for (const number of [1, 2, 3]) {
      await page
        .getByRole("button", {
          name: `Adicionar E2E Game ${String(number).padStart(2, "0")}`,
          exact: true,
        })
        .click();
    }
    await input.fill("");
    const row = page.locator(".tierlist-edit-row").last();
    const target = row.locator(".tierlist-edit-games");
    for (const number of [1, 2, 3]) {
      const source = page.locator(
        `[data-zone="pool"] [data-cover="${900_000 + number}"]`,
      );
      await source.scrollIntoViewIfNeeded();
      const from = await source.boundingBox();
      const to = await target.boundingBox();
      expect(from).not.toBeNull();
      expect(to).not.toBeNull();
      await page.mouse.move(
        from!.x + from!.width / 2,
        from!.y + from!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(to!.x + 15, to!.y + to!.height / 2, { steps: 12 });
      await page.mouse.up();
      await expect(
        target.locator(`[data-cover="${900_000 + number}"]`),
      ).toHaveCount(1);
    }
    await row.getByRole("button", { name: "Ordenar tier" }).click();
    await page.getByRole("menuitem", { name: "Mais antigos" }).click();
    await expect(target.locator("img").first()).toHaveAttribute(
      "src",
      /\/logo\.jpg$/,
    );
    await expect(target.locator("img")).toHaveCount(3);
    await expect
      .poll(() =>
        target
          .locator("[data-cover]")
          .evaluateAll((covers) =>
            covers.map((cover) => cover.getAttribute("data-cover")),
          ),
      )
      .toEqual(["900003", "900002", "900001"]);
    await row.getByRole("button", { name: "Ordenar tier" }).click();
    await page.getByRole("menuitem", { name: "Mais novos" }).click();
    await expect
      .poll(() =>
        target
          .locator("[data-cover]")
          .evaluateAll((covers) =>
            covers.map((cover) => cover.getAttribute("data-cover")),
          ),
      )
      .toEqual(["900002", "900003", "900001"]);
  });
});
